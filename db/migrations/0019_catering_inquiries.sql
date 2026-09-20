CREATE TYPE catering_state AS ENUM ('new', 'contacted', 'quoted', 'confirmed', 'cancelled');
CREATE TABLE catering_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_hash text NOT NULL UNIQUE, source_hash text NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80), email text NOT NULL CHECK (email = btrim(email) AND email LIKE '%@%' AND length(email) <= 254),
  phone text NOT NULL CHECK (length(btrim(phone)) BETWEEN 3 AND 30), event_date date, guest_count integer CHECK (guest_count IS NULL OR guest_count BETWEEN 1 AND 500),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000), privacy_version text NOT NULL, locale text NOT NULL CHECK (locale IN ('de', 'en', 'uk')),
  state catering_state NOT NULL DEFAULT 'new', version integer NOT NULL DEFAULT 1 CHECK (version >= 1), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catering_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES catering_inquiries(id) ON DELETE CASCADE,
  from_state catering_state, to_state catering_state NOT NULL, actor_id uuid REFERENCES staff_profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catering_inquiries_queue_idx ON catering_inquiries (state, created_at);
ALTER TABLE catering_inquiries ENABLE ROW LEVEL SECURITY; ALTER TABLE catering_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON catering_inquiries, catering_status_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON catering_inquiries, catering_status_events TO service_role;
CREATE TRIGGER catering_inquiries_touch_updated BEFORE UPDATE ON catering_inquiries FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE FUNCTION create_catering_inquiry(p_idempotency_hash text, p_source_hash text, p_name text, p_email text, p_phone text, p_event_date date, p_guest_count integer, p_message text, p_privacy_version text, p_locale text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_limit integer; v_existing catering_inquiries%ROWTYPE; v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('catering-rate:' || p_source_hash));
  SELECT value::integer INTO v_limit FROM settings WHERE key = 'catering_rate_limit_per_hour';
  IF v_limit IS NULL OR v_limit < 1 THEN RETURN jsonb_build_object('outcome', 'misconfigured'); END IF;
  SELECT * INTO v_existing FROM catering_inquiries WHERE idempotency_hash = p_idempotency_hash;
  IF FOUND THEN RETURN jsonb_build_object('outcome', 'replayed', 'id', v_existing.id, 'state', v_existing.state::text); END IF;
  IF (SELECT count(*) FROM catering_inquiries WHERE source_hash = p_source_hash AND created_at >= now() - interval '1 hour') >= v_limit THEN RETURN jsonb_build_object('outcome', 'rate-limited'); END IF;
  INSERT INTO catering_inquiries (idempotency_hash, source_hash, name, email, phone, event_date, guest_count, message, privacy_version, locale)
  VALUES (p_idempotency_hash, p_source_hash, p_name, lower(trim(p_email)), p_phone, p_event_date, p_guest_count, p_message, p_privacy_version, p_locale) RETURNING id INTO v_id;
  INSERT INTO catering_status_events (inquiry_id, to_state) VALUES (v_id, 'new');
  INSERT INTO email_outbox (logical_key, recipient, locale, template_key, payload, state)
  SELECT 'catering:' || v_id::text, i.email, p_locale, 'catering_inquiry', jsonb_build_object('inquiryId', v_id::text), 'pending'
  FROM staff_profiles p JOIN staff_invitations i ON i.auth_user_id = p.auth_user_id WHERE p.active AND i.accepted_at IS NOT NULL ON CONFLICT (logical_key) DO NOTHING;
  RETURN jsonb_build_object('outcome', 'created', 'id', v_id, 'state', 'new');
END; $$;
CREATE FUNCTION apply_catering_transition(p_inquiry_id uuid, p_expected_version integer, p_to_state catering_state, p_actor_id uuid, p_correlation_id text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_inquiry catering_inquiries%ROWTYPE;
BEGIN
  SELECT * INTO v_inquiry FROM catering_inquiries WHERE id = p_inquiry_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_inquiry.version <> p_expected_version THEN RETURN jsonb_build_object('status', 'conflict', 'version', v_inquiry.version); END IF;
  IF NOT ((v_inquiry.state = 'new' AND p_to_state IN ('contacted', 'cancelled')) OR (v_inquiry.state = 'contacted' AND p_to_state IN ('quoted', 'cancelled')) OR (v_inquiry.state = 'quoted' AND p_to_state IN ('confirmed', 'cancelled'))) THEN
    INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id) VALUES (p_actor_id, 'catering.transition.invalid', 'catering_inquiry', p_inquiry_id::text, jsonb_build_object('state', v_inquiry.state), jsonb_build_object('toState', p_to_state), p_correlation_id);
    RETURN jsonb_build_object('status', 'invalid', 'version', v_inquiry.version);
  END IF;
  UPDATE catering_inquiries SET state = p_to_state, version = v_inquiry.version + 1 WHERE id = p_inquiry_id;
  INSERT INTO catering_status_events (inquiry_id, from_state, to_state, actor_id) VALUES (p_inquiry_id, v_inquiry.state, p_to_state, p_actor_id);
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id) VALUES (p_actor_id, 'catering.transition.apply', 'catering_inquiry', p_inquiry_id::text, jsonb_build_object('state', v_inquiry.state, 'version', v_inquiry.version), jsonb_build_object('state', p_to_state, 'version', v_inquiry.version + 1), p_correlation_id);
  RETURN jsonb_build_object('status', 'applied', 'state', p_to_state::text, 'version', v_inquiry.version + 1);
END; $$;
GRANT EXECUTE ON FUNCTION create_catering_inquiry(text, text, text, text, text, date, integer, text, text, text), apply_catering_transition(uuid, integer, catering_state, uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION create_catering_inquiry(text, text, text, text, text, date, integer, text, text, text), apply_catering_transition(uuid, integer, catering_state, uuid, text) FROM PUBLIC;
