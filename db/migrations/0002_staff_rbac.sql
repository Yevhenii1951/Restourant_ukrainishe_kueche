-- Staff RBAC: profiles, invitations, audit events.
-- Server-controlled roles; anon/authenticated get no direct access.
-- service_role (server) owns all writes. Audit events are append-only.

CREATE TABLE staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('STAFF', 'MANAGER', 'ADMIN')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('STAFF', 'MANAGER', 'ADMIN')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  inviter_id uuid NOT NULL REFERENCES staff_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_id, created_at DESC);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Staff may read only their own profile; all writes stay server-side (service_role).
CREATE POLICY staff_profiles_self_select ON staff_profiles
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

REVOKE ALL ON staff_profiles, staff_invitations, audit_events FROM anon, authenticated;
GRANT SELECT ON staff_profiles TO authenticated;
GRANT ALL ON staff_profiles, staff_invitations, audit_events TO service_role;
GRANT USAGE ON SCHEMA public TO service_role, authenticated;

-- Serialize admin demotions/deactivations so concurrent writes cannot remove every admin.
CREATE FUNCTION staff_profiles_keep_active_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.active AND OLD.role = 'ADMIN'
     AND (NOT NEW.active OR NEW.role <> 'ADMIN') THEN
    PERFORM pg_advisory_xact_lock(hashtext('staff_profiles:active-admin'));
    IF NOT EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE id <> OLD.id AND active AND role = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'cannot remove the last active admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_profiles_last_admin
BEFORE UPDATE OF role, active ON staff_profiles
FOR EACH ROW EXECUTE FUNCTION staff_profiles_keep_active_admin();

-- Append-only audit: forbid UPDATE/DELETE for every role, including service_role.
CREATE FUNCTION audit_events_no_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_no_mutation();
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
  invitation_email text,
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
  INSERT INTO staff_invitations (id, email, role, token_hash, expires_at, inviter_id)
  VALUES (invitation_id, invitation_email, invitation_role, invitation_token_hash,
          invitation_expires_at, invitation_inviter_id);
  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, after_data, correlation_id)
  VALUES (invitation_inviter_id, 'staff.invitation.create', 'staff_invitation', invitation_id::text,
          jsonb_build_object('role', invitation_role), audit_correlation_id);
END;
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
REVOKE ALL ON FUNCTION create_staff_invitation_with_audit(uuid, text, text, text, timestamptz, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION bootstrap_staff_admin(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_staff_role_with_audit(uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION set_staff_active_with_audit(uuid, boolean, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION create_staff_invitation_with_audit(uuid, text, text, text, timestamptz, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION bootstrap_staff_admin(uuid, text, text) TO service_role;
