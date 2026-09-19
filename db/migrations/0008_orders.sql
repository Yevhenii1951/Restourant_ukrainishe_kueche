-- Guest pickup order with cash on pickup (KLN-011).
-- One transaction snapshots the server-computed money breakdown into an
-- immutable order, plus item/modifier snapshots and an append-only status log.
-- Public token and idempotency key are stored as sha256 hex; contact columns
-- are never exposed to anon/authenticated (RLS) and public projections filter
-- them out. State transitions are guarded at the trigger level.

CREATE TYPE order_state AS ENUM (
  'pending_confirmation', 'accepted', 'preparing', 'ready', 'completed',
  'cancelled', 'rejected'
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  public_token_hash text NOT NULL UNIQUE,
  idempotency_hash text NOT NULL UNIQUE,
  request_hash text NOT NULL,
  fulfilment text NOT NULL CHECK (fulfilment IN ('pickup', 'delivery')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash_pickup')),
  scheduled_for timestamptz NOT NULL,
  guest_name text,
  guest_phone text,
  privacy_version text NOT NULL,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  state order_state NOT NULL DEFAULT 'pending_confirmation',
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  promo_code_lookup text,
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  tip_cents integer NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  source_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  base_price_cents integer NOT NULL CHECK (base_price_cents >= 0),
  line_total_cents integer NOT NULL CHECK (line_total_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  allergen_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE order_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id),
  group_source_id uuid REFERENCES modifier_groups(id) ON DELETE SET NULL,
  option_source_id uuid REFERENCES modifier_options(id) ON DELETE SET NULL,
  group_name_snapshot text NOT NULL,
  option_name_snapshot text NOT NULL,
  delta_cents integer NOT NULL CHECK (delta_cents >= 0),
  UNIQUE (order_item_id, group_source_id, option_source_id)
);

CREATE TABLE order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  from_state order_state,
  to_state order_state NOT NULL,
  reason text,
  actor uuid REFERENCES staff_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_schedule_idx ON orders (fulfilment, scheduled_for, state);
CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_item_modifiers_item_idx ON order_item_modifiers (order_item_id);
CREATE INDEX order_status_events_order_idx ON order_status_events (order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON orders, order_items, order_item_modifiers, order_status_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON orders, order_items, order_item_modifiers, order_status_events TO service_role;

CREATE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_touch_updated
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Only the guest-created -> cancelled transition exists so far; the accepted /
-- rejected / preparing / ready / completed edges arrive with the staff queue.
CREATE FUNCTION guard_order_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;
  IF NOT (
    OLD.state = 'pending_confirmation' AND NEW.state = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid order state transition: % -> %', OLD.state, NEW.state
      USING ERRCODE = 'P0001';
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_state_guard
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION guard_order_transition();

-- Transactional insert of a pickup/cash order. The caller recomputes totals
-- server-side; this function only snapshots given values under the unique
-- idempotency-key constraint and writes the append-only status event.
CREATE FUNCTION insert_pickup_order(
  p_public_token_hash text,
  p_idempotency_hash text,
  p_request_hash text,
  p_scheduled_for timestamptz,
  p_guest_name text,
  p_guest_phone text,
  p_privacy_version text,
  p_subtotal_cents integer,
  p_promo_code_lookup text,
  p_discount_cents integer,
  p_tip_cents integer,
  p_total_cents integer,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_modifier jsonb;
  v_order_item_id uuid;
BEGIN
  -- Capacity: the 15-minute bucket must still have room for this new order.
  IF (
    SELECT count(*) FROM orders
    WHERE fulfilment = 'pickup'
      AND scheduled_for = p_scheduled_for
      AND state NOT IN ('cancelled', 'rejected')
  ) >= (
    SELECT capacity_per_slot FROM service_windows w
    WHERE w.active
      AND w.fulfilment = 'pickup'
      AND (
        w.date_override = (p_scheduled_for AT TIME ZONE 'Europe/Berlin')::date
        OR (w.date_override IS NULL)
      )
    ORDER BY w.capacity_per_slot DESC
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'selected slot is full' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO orders (
    public_token_hash, idempotency_hash, request_hash, fulfilment, payment_method,
    scheduled_for, guest_name, guest_phone, privacy_version,
    subtotal_cents, promo_code_lookup, discount_cents, tip_cents, total_cents
  ) VALUES (
    p_public_token_hash, p_idempotency_hash, p_request_hash, 'pickup', 'cash_pickup',
    p_scheduled_for, p_guest_name, p_guest_phone, p_privacy_version,
    p_subtotal_cents, p_promo_code_lookup, p_discount_cents, p_tip_cents, p_total_cents
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id, source_item_id, name_snapshot, base_price_cents, line_total_cents,
      quantity, allergen_snapshot
    ) VALUES (
      v_order_id, NULL,
      v_item->>'name',
      (v_item->>'basePriceCents')::integer,
      (v_item->>'lineTotalCents')::integer,
      (v_item->>'quantity')::integer,
      COALESCE(v_item->'allergens', '[]'::jsonb)
    )
    RETURNING id INTO v_order_item_id;

    FOR v_modifier IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'modifiers', '[]'::jsonb)) LOOP
      INSERT INTO order_item_modifiers (
        order_item_id, group_source_id, option_source_id,
        group_name_snapshot, option_name_snapshot, delta_cents
      ) VALUES (
        v_order_item_id, NULL, NULL,
        v_modifier->>'groupName',
        v_modifier->>'optionName',
        (v_modifier->>'deltaCents')::integer
      );
    END LOOP;
  END LOOP;

  INSERT INTO order_status_events (order_id, from_state, to_state, reason)
  VALUES (v_order_id, NULL, 'pending_confirmation', 'guest_created');

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_pickup_order(text, text, text, timestamptz, text, text, text, integer, text, integer, integer, integer, jsonb) TO service_role;

-- Atomic cancel while still pending confirmation. Returns a safe projection
-- (no contact data) or NULL when the token is unknown / the order is not
-- cancellable, so callers never learn whether a token differs in shape.
CREATE FUNCTION cancel_pending_order(
  p_token_hash text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders
  WHERE public_token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND OR v_order.state <> 'pending_confirmation' THEN
    RETURN NULL;
  END IF;

  UPDATE orders SET state = 'cancelled',
    guest_name = NULL, guest_phone = NULL
  WHERE id = v_order.id;

  INSERT INTO order_status_events (order_id, from_state, to_state, reason)
  VALUES (v_order.id, 'pending_confirmation', 'cancelled', p_reason);

  RETURN jsonb_build_object(
    'orderNumber', v_order.order_number,
    'state', 'cancelled',
    'scheduledFor', to_char(v_order.scheduled_for AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'subtotalCents', v_order.subtotal_cents,
    'discountCents', v_order.discount_cents,
    'tipCents', v_order.tip_cents,
    'totalCents', v_order.total_cents
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_pending_order(text, text) TO service_role;