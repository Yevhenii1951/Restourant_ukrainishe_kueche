CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'stripe'),
  provider_checkout_session_id text NOT NULL UNIQUE,
  provider_checkout_url text NOT NULL,
  provider_payment_intent_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL CHECK (currency = 'EUR'),
  state text NOT NULL CHECK (state IN ('checkout_created', 'paid', 'payment_failed', 'refund_pending', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
  provider_event_id text PRIMARY KEY,
  provider text NOT NULL CHECK (provider = 'stripe'),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash_pickup', 'cash_delivery', 'stripe_checkout'));

CREATE OR REPLACE FUNCTION guard_order_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'awaiting_payment' AND NEW.state IN ('pending_confirmation', 'payment_failed', 'cancelled')) OR
    (OLD.state = 'pending_confirmation' AND NEW.state IN ('accepted', 'rejected', 'cancelled')) OR
    (OLD.state = 'accepted' AND NEW.state IN ('preparing', 'cancelled')) OR
    (OLD.state = 'preparing' AND NEW.state IN ('ready', 'cancelled')) OR
    (OLD.state = 'ready' AND NEW.state IN ('completed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'invalid order state transition: % -> %', OLD.state, NEW.state
      USING ERRCODE = 'P0001';
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payments, payment_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON payments, payment_events TO service_role;

CREATE TRIGGER payments_touch_updated
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE FUNCTION insert_stripe_checkout_order(
  p_public_token_hash text,
  p_idempotency_hash text,
  p_request_hash text,
  p_fulfilment text,
  p_scheduled_for timestamptz,
  p_guest_name text,
  p_guest_phone text,
  p_privacy_version text,
  p_subtotal_cents integer,
  p_promo_code_lookup text,
  p_discount_cents integer,
  p_delivery_fee_cents integer,
  p_tip_cents integer,
  p_total_cents integer,
  p_items jsonb,
  p_street text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_delivery_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_modifier jsonb;
  v_order_item_id uuid;
BEGIN
  IF p_fulfilment NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'invalid fulfilment' USING ERRCODE = 'P0001';
  END IF;

  IF (
    SELECT count(*) FROM orders
    WHERE fulfilment = p_fulfilment
      AND scheduled_for = p_scheduled_for
      AND state NOT IN ('cancelled', 'rejected', 'payment_failed')
  ) >= (
    SELECT capacity_per_slot FROM service_windows w
    WHERE w.active
      AND w.fulfilment = p_fulfilment::commercial_service_type
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
    scheduled_for, guest_name, guest_phone, privacy_version, state,
    subtotal_cents, promo_code_lookup, discount_cents, delivery_fee_cents, tip_cents, total_cents
  ) VALUES (
    p_public_token_hash, p_idempotency_hash, p_request_hash, p_fulfilment, 'stripe_checkout',
    p_scheduled_for, p_guest_name, p_guest_phone, p_privacy_version, 'awaiting_payment',
    p_subtotal_cents, p_promo_code_lookup, p_discount_cents, p_delivery_fee_cents, p_tip_cents, p_total_cents
  ) RETURNING id INTO v_order_id;

  IF p_fulfilment = 'delivery' THEN
    INSERT INTO order_delivery_addresses (order_id, street, house_number, postal_code, city, delivery_note)
    VALUES (v_order_id, p_street, p_house_number, p_postal_code, p_city, p_delivery_note);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (order_id, source_item_id, name_snapshot, base_price_cents, line_total_cents, quantity, allergen_snapshot)
    VALUES (v_order_id, NULL, v_item->>'name', (v_item->>'basePriceCents')::integer,
      (v_item->>'lineTotalCents')::integer, (v_item->>'quantity')::integer,
      COALESCE(v_item->'allergens', '[]'::jsonb))
    RETURNING id INTO v_order_item_id;

    FOR v_modifier IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'modifiers', '[]'::jsonb)) LOOP
      INSERT INTO order_item_modifiers (order_item_id, group_name_snapshot, option_name_snapshot, delta_cents)
      VALUES (v_order_item_id, v_modifier->>'groupName', v_modifier->>'optionName', (v_modifier->>'deltaCents')::integer);
    END LOOP;
  END LOOP;

  INSERT INTO order_status_events (order_id, from_state, to_state, reason)
  VALUES (v_order_id, NULL, 'awaiting_payment', 'stripe_checkout_created');

  RETURN v_order_id;
END;
$$;

CREATE FUNCTION bind_stripe_checkout_payment(
  p_order_id uuid,
  p_session_id text,
  p_session_url text,
  p_amount_cents integer,
  p_currency text
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  INSERT INTO payments (order_id, provider, provider_checkout_session_id, provider_checkout_url, amount_cents, currency, state)
  VALUES (p_order_id, 'stripe', p_session_id, p_session_url, p_amount_cents, upper(p_currency), 'checkout_created')
  ON CONFLICT (order_id) DO UPDATE
  SET provider_checkout_session_id = EXCLUDED.provider_checkout_session_id,
      provider_checkout_url = EXCLUDED.provider_checkout_url,
      amount_cents = EXCLUDED.amount_cents,
      currency = EXCLUDED.currency
  RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;

CREATE FUNCTION mark_stripe_checkout_paid(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer,
  p_currency text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_inserted integer := 0;
BEGIN
  INSERT INTO payment_events (provider_event_id, provider, event_type, payload, result)
  VALUES (p_event_id, 'stripe', p_event_type, p_payload, 'processing')
  ON CONFLICT (provider_event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  SELECT * INTO v_payment FROM payments
  WHERE provider = 'stripe' AND provider_checkout_session_id = p_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE payment_events SET result = 'not-bound' WHERE provider_event_id = p_event_id;
    RETURN jsonb_build_object('status', 'not-bound');
  END IF;

  IF v_payment.amount_cents <> p_amount_cents OR v_payment.currency <> upper(p_currency) THEN
    UPDATE payment_events SET result = 'amount-currency-mismatch' WHERE provider_event_id = p_event_id;
    RETURN jsonb_build_object('status', 'amount-currency-mismatch');
  END IF;

  IF v_payment.state = 'paid' THEN
    UPDATE payment_events SET result = 'already-paid' WHERE provider_event_id = p_event_id;
    RETURN jsonb_build_object('status', 'already-paid');
  END IF;

  UPDATE payments
  SET state = 'paid', provider_payment_intent_id = p_payment_intent_id
  WHERE id = v_payment.id;

  UPDATE orders SET state = 'pending_confirmation'
  WHERE id = v_payment.order_id AND state = 'awaiting_payment';
  IF FOUND THEN
    INSERT INTO order_status_events (order_id, from_state, to_state, reason)
    VALUES (v_payment.order_id, 'awaiting_payment', 'pending_confirmation', 'stripe_paid');
  END IF;

  UPDATE payment_events SET result = 'paid' WHERE provider_event_id = p_event_id;
  RETURN jsonb_build_object('status', 'paid', 'orderId', v_payment.order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION insert_stripe_checkout_order(text, text, text, text, timestamptz, text, text, text, integer, text, integer, integer, integer, integer, jsonb, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION bind_stripe_checkout_payment(uuid, text, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION mark_stripe_checkout_paid(text, text, jsonb, text, text, integer, text) TO service_role;
REVOKE EXECUTE ON FUNCTION insert_stripe_checkout_order(text, text, text, text, timestamptz, text, text, text, integer, text, integer, integer, integer, integer, jsonb, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION bind_stripe_checkout_payment(uuid, text, text, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION mark_stripe_checkout_paid(text, text, jsonb, text, text, integer, text) FROM PUBLIC;
