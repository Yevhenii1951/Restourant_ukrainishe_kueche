CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'stripe'),
  provider_refund_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL CHECK (currency = 'EUR'),
  state text NOT NULL CHECK (state IN ('pending', 'failed', 'succeeded')),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 200),
  actor_id uuid NOT NULL REFERENCES staff_profiles(id),
  idempotency_key text NOT NULL UNIQUE,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refunds_reconciliation_idx ON refunds (state, updated_at) WHERE state <> 'succeeded';

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON refunds FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON refunds TO service_role;

CREATE TRIGGER refunds_touch_updated
BEFORE UPDATE ON refunds
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE payments DROP CONSTRAINT payments_state_check;
ALTER TABLE payments ADD CONSTRAINT payments_state_check
  CHECK (state IN ('checkout_created', 'paid', 'payment_failed', 'refund_pending', 'refund_failed', 'refunded'));

CREATE FUNCTION prepare_stripe_full_refund(
  p_order_id uuid,
  p_reason text,
  p_actor_id uuid,
  p_correlation_id text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_refund refunds%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_payment.state NOT IN ('paid', 'refund_failed', 'refund_pending')
    OR v_payment.provider_payment_intent_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not-refundable');
  END IF;

  SELECT * INTO v_refund FROM refunds WHERE payment_id = v_payment.id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO refunds (payment_id, provider, amount_cents, currency, state, reason, actor_id, idempotency_key)
    VALUES (v_payment.id, 'stripe', v_payment.amount_cents, v_payment.currency, 'pending', p_reason, p_actor_id,
      md5('refund:' || v_payment.id::text))
    RETURNING * INTO v_refund;
  ELSIF v_refund.state = 'succeeded' THEN
    RETURN jsonb_build_object('status', 'succeeded', 'refundId', v_refund.id);
  ELSIF v_refund.state = 'pending' AND v_refund.provider_refund_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'pending', 'refundId', v_refund.id);
  ELSE
    UPDATE refunds SET state = 'pending', failure_code = NULL, reason = p_reason, actor_id = p_actor_id
    WHERE id = v_refund.id RETURNING * INTO v_refund;
  END IF;

  UPDATE payments SET state = 'refund_pending' WHERE id = v_payment.id AND state <> 'refund_pending';
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  VALUES (p_actor_id, 'payment.refund.request', 'refund', v_refund.id::text,
    jsonb_build_object('paymentState', v_payment.state),
    jsonb_build_object('amountCents', v_refund.amount_cents, 'reason', p_reason, 'state', v_refund.state), p_correlation_id);
  RETURN jsonb_build_object('status', 'ready', 'refundId', v_refund.id, 'paymentIntentId', v_payment.provider_payment_intent_id,
    'amountCents', v_refund.amount_cents, 'currency', v_refund.currency, 'idempotencyKey', v_refund.idempotency_key);
END;
$$;

CREATE FUNCTION record_stripe_refund_provider_result(
  p_refund_id uuid,
  p_provider_refund_id text,
  p_success boolean,
  p_failure_code text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_refund refunds%ROWTYPE;
BEGIN
  UPDATE refunds SET provider_refund_id = p_provider_refund_id, state = CASE WHEN p_success THEN 'pending' ELSE 'failed' END,
    failure_code = CASE WHEN p_success THEN NULL ELSE p_failure_code END
  WHERE id = p_refund_id
  RETURNING * INTO v_refund;
  UPDATE payments SET state = CASE WHEN p_success THEN 'refund_pending' ELSE 'refund_failed' END
  WHERE id = v_refund.payment_id;
  IF NOT p_success THEN
    INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_data, correlation_id)
    VALUES (v_refund.actor_id, 'payment.refund.failed', 'refund', v_refund.id::text,
      jsonb_build_object('failureCode', p_failure_code), 'stripe:' || p_provider_refund_id);
  END IF;
END;
$$;

CREATE FUNCTION mark_stripe_refund_succeeded(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_provider_refund_id text,
  p_amount_cents integer,
  p_currency text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_refund refunds%ROWTYPE;
BEGIN
  INSERT INTO payment_events (provider_event_id, provider, event_type, payload, result)
  VALUES (p_event_id, 'stripe', p_event_type, p_payload, 'processing') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'duplicate'); END IF;
  SELECT * INTO v_refund FROM refunds WHERE provider_refund_id = p_provider_refund_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE payment_events SET result = 'not-bound' WHERE provider_event_id = p_event_id;
    RETURN jsonb_build_object('status', 'not-bound');
  END IF;
  IF v_refund.amount_cents <> p_amount_cents OR v_refund.currency <> upper(p_currency) THEN
    UPDATE payment_events SET result = 'amount-currency-mismatch' WHERE provider_event_id = p_event_id;
    RETURN jsonb_build_object('status', 'amount-currency-mismatch');
  END IF;
  UPDATE refunds SET state = 'succeeded', failure_code = NULL WHERE id = v_refund.id AND state <> 'succeeded';
  UPDATE payments SET state = 'refunded' WHERE id = v_refund.payment_id AND state <> 'refunded';
  UPDATE payment_events SET result = 'refunded' WHERE provider_event_id = p_event_id;
  RETURN jsonb_build_object('status', 'refunded');
END;
$$;

GRANT EXECUTE ON FUNCTION prepare_stripe_full_refund(uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION record_stripe_refund_provider_result(uuid, text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION mark_stripe_refund_succeeded(text, text, jsonb, text, integer, text) TO service_role;
REVOKE EXECUTE ON FUNCTION prepare_stripe_full_refund(uuid, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_stripe_refund_provider_result(uuid, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION mark_stripe_refund_succeeded(text, text, jsonb, text, integer, text) FROM PUBLIC;
