CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE voucher_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denomination_cents integer NOT NULL UNIQUE CHECK (denomination_cents > 0),
  name_de text NOT NULL,
  name_en text NOT NULL,
  name_uk text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE voucher_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES voucher_products(id),
  buyer_email text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('de', 'en', 'uk')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  state text NOT NULL CHECK (state IN ('payment_pending', 'active', 'payment_failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL UNIQUE REFERENCES voucher_purchases(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE CHECK (length(code_hash) = 64),
  code_last4 text NOT NULL CHECK (length(code_last4) = 4),
  original_balance_cents integer NOT NULL CHECK (original_balance_cents > 0),
  remaining_balance_cents integer NOT NULL CHECK (remaining_balance_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  state text NOT NULL CHECK (state IN ('active', 'depleted', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (remaining_balance_cents <= original_balance_cents)
);

CREATE TABLE voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES vouchers(id),
  order_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  idempotency_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, order_id)
);

ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN voucher_purchase_id uuid UNIQUE REFERENCES voucher_purchases(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_exactly_one_target
  CHECK ((order_id IS NOT NULL)::integer + (voucher_purchase_id IS NOT NULL)::integer = 1);

CREATE TRIGGER voucher_purchases_touch_updated BEFORE UPDATE ON voucher_purchases
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER vouchers_touch_updated BEFORE UPDATE ON vouchers
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE voucher_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON voucher_products, voucher_purchases, vouchers, voucher_redemptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON voucher_products, voucher_purchases, vouchers, voucher_redemptions TO service_role;

CREATE FUNCTION create_voucher_purchase_intent(p_product_id uuid, p_buyer_email text, p_locale text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_product voucher_products%ROWTYPE; v_purchase_id uuid;
BEGIN
  SELECT * INTO v_product FROM voucher_products WHERE id = p_product_id AND active;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not-found'); END IF;
  INSERT INTO voucher_purchases (product_id, buyer_email, locale, amount_cents, state)
  VALUES (v_product.id, lower(trim(p_buyer_email)), p_locale, v_product.denomination_cents, 'payment_pending')
  RETURNING id INTO v_purchase_id;
  RETURN jsonb_build_object('status', 'ready', 'purchaseId', v_purchase_id, 'amountCents', v_product.denomination_cents);
END;
$$;

CREATE FUNCTION bind_stripe_voucher_payment(
  p_purchase_id uuid, p_session_id text, p_session_url text, p_amount_cents integer, p_currency text
) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE v_payment_id uuid;
BEGIN
  INSERT INTO payments (voucher_purchase_id, provider, provider_checkout_session_id, provider_checkout_url, amount_cents, currency, state)
  VALUES (p_purchase_id, 'stripe', p_session_id, p_session_url, p_amount_cents, upper(p_currency), 'checkout_created')
  ON CONFLICT (voucher_purchase_id) DO UPDATE
  SET provider_checkout_session_id = EXCLUDED.provider_checkout_session_id,
      provider_checkout_url = EXCLUDED.provider_checkout_url,
      amount_cents = EXCLUDED.amount_cents,
      currency = EXCLUDED.currency
  RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;

CREATE FUNCTION activate_paid_voucher(p_payment payments, p_event_id text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_purchase voucher_purchases%ROWTYPE; v_code text; v_hash text;
BEGIN
  SELECT * INTO v_purchase FROM voucher_purchases WHERE id = p_payment.voucher_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not-bound'); END IF;
  IF v_purchase.state = 'active' THEN RETURN jsonb_build_object('status', 'already-paid'); END IF;
  v_code := upper(encode(gen_random_bytes(9), 'hex'));
  v_hash := encode(digest(v_code, 'sha256'), 'hex');
  INSERT INTO vouchers (purchase_id, code_hash, code_last4, original_balance_cents, remaining_balance_cents, state)
  VALUES (v_purchase.id, v_hash, right(v_code, 4), v_purchase.amount_cents, v_purchase.amount_cents, 'active');
  UPDATE voucher_purchases SET state = 'active' WHERE id = v_purchase.id;
  PERFORM enqueue_email('voucher:' || v_purchase.id::text || ':paid', v_purchase.buyer_email, v_purchase.locale,
    'voucher_purchased', jsonb_build_object('code', v_code, 'amountCents', v_purchase.amount_cents::text));
  UPDATE payment_events SET result = 'paid' WHERE provider_event_id = p_event_id;
  RETURN jsonb_build_object('status', 'paid', 'voucherPurchaseId', v_purchase.id);
END;
$$;

CREATE OR REPLACE FUNCTION mark_stripe_checkout_paid(
  p_event_id text, p_event_type text, p_payload jsonb, p_session_id text,
  p_payment_intent_id text, p_amount_cents integer, p_currency text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_payment payments%ROWTYPE; v_inserted integer := 0;
BEGIN
  INSERT INTO payment_events (provider_event_id, provider, event_type, payload, result)
  VALUES (p_event_id, 'stripe', p_event_type, p_payload, 'processing') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN jsonb_build_object('status', 'duplicate'); END IF;
  SELECT * INTO v_payment FROM payments WHERE provider = 'stripe' AND provider_checkout_session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN UPDATE payment_events SET result = 'not-bound' WHERE provider_event_id = p_event_id; RETURN jsonb_build_object('status', 'not-bound'); END IF;
  IF v_payment.amount_cents <> p_amount_cents OR v_payment.currency <> upper(p_currency) THEN
    UPDATE payment_events SET result = 'amount-currency-mismatch' WHERE provider_event_id = p_event_id;
    RETURN jsonb_build_object('status', 'amount-currency-mismatch');
  END IF;
  IF v_payment.state = 'paid' THEN UPDATE payment_events SET result = 'already-paid' WHERE provider_event_id = p_event_id; RETURN jsonb_build_object('status', 'already-paid'); END IF;
  UPDATE payments SET state = 'paid', provider_payment_intent_id = p_payment_intent_id WHERE id = v_payment.id RETURNING * INTO v_payment;
  IF v_payment.voucher_purchase_id IS NOT NULL THEN RETURN activate_paid_voucher(v_payment, p_event_id); END IF;
  UPDATE orders SET state = 'pending_confirmation' WHERE id = v_payment.order_id AND state = 'awaiting_payment';
  IF FOUND THEN INSERT INTO order_status_events (order_id, from_state, to_state, reason) VALUES (v_payment.order_id, 'awaiting_payment', 'pending_confirmation', 'stripe_paid'); END IF;
  UPDATE payment_events SET result = 'paid' WHERE provider_event_id = p_event_id;
  RETURN jsonb_build_object('status', 'paid', 'orderId', v_payment.order_id);
END;
$$;

CREATE FUNCTION redeem_voucher(p_code_hash text, p_order_id uuid, p_order_total_cents integer, p_idempotency_key text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_voucher vouchers%ROWTYPE; v_existing voucher_redemptions%ROWTYPE; v_amount integer; v_hash text := encode(digest(p_idempotency_key, 'sha256'), 'hex');
BEGIN
  SELECT * INTO v_existing FROM voucher_redemptions WHERE idempotency_hash = v_hash;
  IF FOUND THEN RETURN jsonb_build_object('status', 'duplicate', 'redeemedCents', v_existing.amount_cents); END IF;
  SELECT * INTO v_voucher FROM vouchers WHERE code_hash = p_code_hash FOR UPDATE;
  IF NOT FOUND OR v_voucher.state <> 'active' OR p_order_total_cents <= 0 THEN RETURN jsonb_build_object('status', 'not-redeemable', 'redeemedCents', 0); END IF;
  v_amount := LEAST(v_voucher.remaining_balance_cents, p_order_total_cents);
  IF v_amount <= 0 THEN RETURN jsonb_build_object('status', 'not-redeemable', 'redeemedCents', 0); END IF;
  INSERT INTO voucher_redemptions (voucher_id, order_id, amount_cents, idempotency_hash) VALUES (v_voucher.id, p_order_id, v_amount, v_hash);
  UPDATE vouchers SET remaining_balance_cents = remaining_balance_cents - v_amount,
    state = CASE WHEN remaining_balance_cents - v_amount = 0 THEN 'depleted' ELSE 'active' END
  WHERE id = v_voucher.id;
  RETURN jsonb_build_object('status', 'redeemed', 'redeemedCents', v_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION create_voucher_purchase_intent(uuid, text, text), bind_stripe_voucher_payment(uuid, text, text, integer, text),
  activate_paid_voucher(payments, text), redeem_voucher(text, uuid, integer, text) TO service_role;
REVOKE EXECUTE ON FUNCTION create_voucher_purchase_intent(uuid, text, text), bind_stripe_voucher_payment(uuid, text, text, integer, text),
  activate_paid_voucher(payments, text), redeem_voucher(text, uuid, integer, text) FROM PUBLIC;
