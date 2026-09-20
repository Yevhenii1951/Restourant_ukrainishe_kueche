CREATE TABLE email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), logical_key text NOT NULL UNIQUE, recipient text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('de', 'en', 'uk')), template_key text NOT NULL, payload jsonb NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'sending', 'delivered', 'dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0), next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_outbox_pending_idx ON email_outbox (next_attempt_at) WHERE state = 'pending';
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON email_outbox FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON email_outbox TO service_role;
CREATE TRIGGER email_outbox_touch_updated BEFORE UPDATE ON email_outbox FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE FUNCTION enqueue_email(p_logical_key text, p_recipient text, p_locale text, p_template_key text, p_payload jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO email_outbox (logical_key, recipient, locale, template_key, payload, state) VALUES (p_logical_key, p_recipient, p_locale, p_template_key, p_payload, 'pending') ON CONFLICT (logical_key) DO NOTHING;
$$;
CREATE FUNCTION claim_email_outbox(p_limit integer) RETURNS SETOF email_outbox LANGUAGE plpgsql AS $$
BEGIN RETURN QUERY WITH claimed AS (SELECT id FROM email_outbox WHERE state = 'pending' AND next_attempt_at <= now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 25))
UPDATE email_outbox o SET state = 'sending', attempts = o.attempts + 1 FROM claimed WHERE o.id = claimed.id RETURNING o.*; END;
$$;
CREATE FUNCTION complete_email_outbox(p_id uuid, p_provider_message_id text, p_success boolean) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_attempts integer; BEGIN SELECT attempts INTO v_attempts FROM email_outbox WHERE id = p_id FOR UPDATE; IF NOT FOUND THEN RETURN; END IF;
UPDATE email_outbox SET state = CASE WHEN p_success THEN 'delivered' WHEN v_attempts >= 3 THEN 'dead_letter' ELSE 'pending' END, provider_message_id = CASE WHEN p_success THEN p_provider_message_id ELSE NULL END,
next_attempt_at = CASE WHEN p_success OR v_attempts >= 3 THEN next_attempt_at ELSE now() + interval '1 minute' * v_attempts END WHERE id = p_id; END;
$$;
GRANT EXECUTE ON FUNCTION enqueue_email(text, text, text, text, jsonb), claim_email_outbox(integer), complete_email_outbox(uuid, text, boolean) TO service_role;
REVOKE EXECUTE ON FUNCTION enqueue_email(text, text, text, text, jsonb), claim_email_outbox(integer), complete_email_outbox(uuid, text, boolean) FROM PUBLIC;
