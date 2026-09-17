-- Local test foundation: RLS baseline fixture.
-- A private table with RLS enabled and no grants to anon/authenticated.
-- Roles come from db/bootstrap_roles.sql (cluster-wide, not part of the
-- schema lifecycle that reset/migrate/seed manage).

CREATE SCHEMA fixture;

CREATE TABLE fixture.private_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL
);

ALTER TABLE fixture.private_secrets ENABLE ROW LEVEL SECURITY;

-- anon/authenticated must be able to attempt the query to prove denial is
-- policy-driven, so grant USAGE/SELECT but rely on RLS returning no rows.
GRANT USAGE ON SCHEMA fixture TO anon, authenticated, service_role;
GRANT SELECT ON fixture.private_secrets TO anon, authenticated;
GRANT ALL ON fixture.private_secrets TO service_role;