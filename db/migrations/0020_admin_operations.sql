CREATE FUNCTION redact_audit_json(p_value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_value IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(p_value) = 'object' THEN
    RETURN COALESCE((SELECT jsonb_object_agg(key, redact_audit_json(value)) FROM jsonb_each(p_value)
      WHERE lower(key) NOT IN ('name', 'email', 'phone', 'message', 'token', 'secret', 'password', 'address', 'street', 'house_number', 'postal_code', 'city', 'delivery_note')), '{}'::jsonb);
  END IF;
  IF jsonb_typeof(p_value) = 'array' THEN RETURN COALESCE((SELECT jsonb_agg(redact_audit_json(value)) FROM jsonb_array_elements(p_value)), '[]'::jsonb); END IF;
  RETURN p_value;
END;
$$;
CREATE FUNCTION admin_audit_events() RETURNS TABLE (id uuid, action text, entity_type text, entity_id text, before_data jsonb, after_data jsonb, correlation_id text, created_at timestamptz)
LANGUAGE sql STABLE AS $$ SELECT id, action, entity_type, entity_id, redact_audit_json(before_data), redact_audit_json(after_data), correlation_id, created_at FROM audit_events ORDER BY created_at DESC; $$;
CREATE FUNCTION admin_customer_export() RETURNS TABLE (order_number text, guest_name text, guest_phone text)
LANGUAGE sql STABLE AS $$ SELECT order_number::text, guest_name, guest_phone FROM orders WHERE guest_name IS NOT NULL OR guest_phone IS NOT NULL ORDER BY created_at; $$;
CREATE FUNCTION admin_dashboard_for_day(p_day date) RETURNS TABLE (order_count integer, revenue_cents bigint)
LANGUAGE sql STABLE AS $$ SELECT count(*)::integer, COALESCE(sum(total_cents), 0)::bigint FROM orders WHERE scheduled_for >= p_day::timestamp AT TIME ZONE 'Europe/Berlin' AND scheduled_for < (p_day + 1)::timestamp AT TIME ZONE 'Europe/Berlin' AND state NOT IN ('cancelled', 'rejected'); $$;
GRANT EXECUTE ON FUNCTION redact_audit_json(jsonb), admin_audit_events(), admin_customer_export(), admin_dashboard_for_day(date) TO service_role;
REVOKE EXECUTE ON FUNCTION redact_audit_json(jsonb), admin_audit_events(), admin_customer_export(), admin_dashboard_for_day(date) FROM PUBLIC;
