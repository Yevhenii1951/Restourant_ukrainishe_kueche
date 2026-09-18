-- Atomic server-only mutations keep state changes and their audit event together.
CREATE FUNCTION change_staff_role_with_audit(
  target_id uuid,
  new_role text,
  audit_actor_id uuid,
  audit_correlation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE staff_profiles SET role = new_role, updated_at = now() WHERE id = target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff profile not found'; END IF;
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  VALUES (audit_actor_id, 'staff.role.change', 'staff_profile', target_id::text,
          jsonb_build_object('role', new_role), audit_correlation_id);
END;
$$;

CREATE FUNCTION set_staff_active_with_audit(
  target_id uuid,
  new_active boolean,
  audit_actor_id uuid,
  audit_correlation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE staff_profiles SET active = new_active, updated_at = now() WHERE id = target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff profile not found'; END IF;
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  VALUES (audit_actor_id, CASE WHEN new_active THEN 'staff.active.set' ELSE 'staff.active.clear' END,
          'staff_profile', target_id::text, jsonb_build_object('active', new_active), audit_correlation_id);
END;
$$;

CREATE FUNCTION create_staff_invitation_with_audit(
  invitation_id uuid,
  invitation_auth_user_id uuid,
  invitation_email text,
  invitation_display_name text,
  invitation_role text,
  invitation_token_hash text,
  invitation_expires_at timestamptz,
  invitation_inviter_id uuid,
  audit_correlation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO staff_profiles (auth_user_id, display_name, role)
  VALUES (invitation_auth_user_id, invitation_display_name, invitation_role);
  INSERT INTO staff_invitations
    (id, auth_user_id, email, role, token_hash, expires_at, inviter_id)
  VALUES (invitation_id, invitation_auth_user_id, invitation_email, invitation_role,
          invitation_token_hash, invitation_expires_at, invitation_inviter_id);
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  VALUES (invitation_inviter_id, 'staff.invitation.create', 'staff_invitation', invitation_id::text,
          jsonb_build_object('role', invitation_role), audit_correlation_id);
END;
$$;

CREATE FUNCTION mark_staff_invitation_accepted(invitation_auth_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE staff_invitations
  SET accepted_at = COALESCE(accepted_at, now())
  WHERE auth_user_id = invitation_auth_user_id;
$$;

CREATE FUNCTION bootstrap_staff_admin(
  admin_auth_user_id uuid,
  admin_display_name text,
  audit_correlation_id text
)
RETURNS staff_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created staff_profiles;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('staff_profiles:bootstrap'));
  IF EXISTS (SELECT 1 FROM staff_profiles WHERE active AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'active admin already exists';
  END IF;
  INSERT INTO staff_profiles (auth_user_id, display_name, role)
  VALUES (admin_auth_user_id, admin_display_name, 'ADMIN')
  RETURNING * INTO created;
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  VALUES (created.id, 'staff.bootstrap.admin', 'staff_profile', created.id::text,
          jsonb_build_object('role', 'ADMIN'), audit_correlation_id);
  RETURN created;
END;
$$;

REVOKE ALL ON FUNCTION change_staff_role_with_audit(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_staff_active_with_audit(uuid, boolean, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_staff_invitation_with_audit(uuid, uuid, text, text, text, text, timestamptz, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_staff_invitation_accepted(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION bootstrap_staff_admin(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_staff_role_with_audit(uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION set_staff_active_with_audit(uuid, boolean, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION create_staff_invitation_with_audit(uuid, uuid, text, text, text, text, timestamptz, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION mark_staff_invitation_accepted(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION bootstrap_staff_admin(uuid, text, text) TO service_role;
