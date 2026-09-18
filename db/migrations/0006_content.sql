-- Versioned typed content entries with draft/published separation.
-- Writers always stage under a newer version; publishing snapshots payload into
-- published_payload. The public view only exposes published snapshots.
-- No destructive DELETE is granted to anyone; archive instead.

CREATE TABLE content_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  typed_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  published_payload jsonb,
  publication_state text NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft', 'published', 'archived')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  published_version integer,
  updated_by uuid REFERENCES staff_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CHECK (publication_state <> 'published' OR published_payload IS NOT NULL)
);

CREATE INDEX content_entries_state_idx ON content_entries (publication_state, typed_key);

ALTER TABLE content_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON content_entries FROM anon, authenticated;
REVOKE DELETE ON content_entries FROM service_role;
GRANT SELECT, INSERT, UPDATE ON content_entries TO service_role;

CREATE VIEW content_entries_public AS
SELECT
  id,
  typed_key,
  published_payload AS payload,
  published_at
FROM content_entries
WHERE publication_state = 'published'
  AND published_payload IS NOT NULL;

GRANT SELECT ON content_entries_public TO anon, authenticated, service_role;