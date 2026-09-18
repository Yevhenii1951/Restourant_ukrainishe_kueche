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
  auth_user_id uuid NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('STAFF', 'MANAGER', 'ADMIN')),
  token_hash text UNIQUE,
  expires_at timestamptz,
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
