-- Delivery checkout (KLN-016): exact PLZ zone + address snapshot.

ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash_pickup', 'cash_delivery'));

CREATE TABLE order_delivery_addresses (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  street text NOT NULL CHECK (length(btrim(street)) BETWEEN 1 AND 120),
  house_number text NOT NULL CHECK (length(btrim(house_number)) BETWEEN 1 AND 20),
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  city text NOT NULL CHECK (length(btrim(city)) BETWEEN 1 AND 80),
  delivery_note text CHECK (delivery_note IS NULL OR length(delivery_note) <= 300)
);

ALTER TABLE order_delivery_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON order_delivery_addresses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON order_delivery_addresses TO service_role;

CREATE FUNCTION insert_delivery_order(
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
  p_delivery_fee_cents integer,
  p_tip_cents integer,
  p_total_cents integer,
  p_items jsonb,
  p_street text,
  p_house_number text,
  p_postal_code text,
  p_city text,
  p_delivery_note text
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_modifier jsonb;
  v_order_item_id uuid;
BEGIN
  IF (
    SELECT count(*) FROM orders
    WHERE fulfilment = 'delivery'
      AND scheduled_for = p_scheduled_for
      AND state NOT IN ('cancelled', 'rejected')
  ) >= (
    SELECT capacity_per_slot FROM service_windows w
    WHERE w.active
      AND w.fulfilment = 'delivery'
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
    subtotal_cents, promo_code_lookup, discount_cents, delivery_fee_cents, tip_cents, total_cents
  ) VALUES (
    p_public_token_hash, p_idempotency_hash, p_request_hash, 'delivery', 'cash_delivery',
    p_scheduled_for, p_guest_name, p_guest_phone, p_privacy_version,
    p_subtotal_cents, p_promo_code_lookup, p_discount_cents, p_delivery_fee_cents, p_tip_cents, p_total_cents
  ) RETURNING id INTO v_order_id;

  INSERT INTO order_delivery_addresses (order_id, street, house_number, postal_code, city, delivery_note)
  VALUES (v_order_id, p_street, p_house_number, p_postal_code, p_city, p_delivery_note);

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
  VALUES (v_order_id, NULL, 'pending_confirmation', 'guest_created');

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_delivery_order(text, text, text, timestamptz, text, text, text, integer, text, integer, integer, integer, integer, jsonb, text, text, text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION insert_delivery_order(text, text, text, timestamptz, text, text, text, integer, text, integer, integer, integer, integer, jsonb, text, text, text, text, text) FROM PUBLIC;
