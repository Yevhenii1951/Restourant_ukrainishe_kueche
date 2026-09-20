-- Reservation table inventory and availability base (KLN-013, FR-RES-1/2/6).
-- Introduces the 'reservation' service into the shared windows/closures from
-- 0007 and models physical tables plus named combinations used by the
-- smallest-fit allocation planner. No reservation persistence yet (KLN-014),
-- so no reservations rows exist; the blocking query arrives with KLN-014.
-- NOTE: the new enum value must not be used by this migration because
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction; demo rows
-- that reference it live in seed 0006.

ALTER TYPE commercial_service_type ADD VALUE IF NOT EXISTS 'reservation';

CREATE TABLE restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_label text NOT NULL UNIQUE
    CHECK (internal_label = btrim(internal_label) AND length(internal_label) <= 60),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 200),
  area text NOT NULL CHECK (length(btrim(area)) BETWEEN 1 AND 40),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE table_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
    CHECK (name = btrim(name) AND length(name) <= 60),
  -- Computed by the sync triggers below from the active member tables; NULL
  -- until a table joins the combination (no active members = NULL, never 0).
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE table_combination_members (
  combination_id uuid NOT NULL REFERENCES table_combinations(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  PRIMARY KEY (combination_id, table_id)
);

-- Combination capacity is always the sum of its currently active member
-- tables: one source of truth recomputed by the database so the availability
-- planner can never read a stale number. Service-level validation additionally
-- requires a combination to combine at least two different active tables.
CREATE FUNCTION sync_table_combination_capacity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_combination_id uuid;
BEGIN
  v_combination_id := COALESCE(NEW.combination_id, OLD.combination_id);
  IF v_combination_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM table_combinations c WHERE c.id = v_combination_id
  ) THEN
    UPDATE table_combinations c
    SET capacity = (SELECT sum(t.capacity)
                    FROM table_combination_members m
                    JOIN restaurant_tables t ON t.id = m.table_id AND t.active
                    WHERE m.combination_id = v_combination_id),
        updated_at = now()
    WHERE c.id = v_combination_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER table_combination_members_sync
AFTER INSERT OR DELETE ON table_combination_members
FOR EACH ROW EXECUTE FUNCTION sync_table_combination_capacity();

-- A table capacity/active switch or hard delete must re-settle every
-- combination it belongs to (member rows are not touched in these cases).
CREATE FUNCTION sync_combination_capacity_for_table() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE table_combinations c
  SET capacity = (SELECT sum(t.capacity)
                  FROM table_combination_members m
                  JOIN restaurant_tables t ON t.id = m.table_id AND t.active
                  WHERE m.combination_id = c.id),
      updated_at = now()
  WHERE c.id IN (
    SELECT m.combination_id
    FROM table_combination_members m
    WHERE m.table_id = COALESCE(NEW.id, OLD.id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER restaurant_tables_capacity_sync
AFTER UPDATE OF capacity, active ON restaurant_tables
FOR EACH ROW EXECUTE FUNCTION sync_combination_capacity_for_table();

CREATE TRIGGER restaurant_tables_deleted_sync
AFTER DELETE ON restaurant_tables
FOR EACH ROW EXECUTE FUNCTION sync_combination_capacity_for_table();

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_combination_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON restaurant_tables, table_combinations, table_combination_members
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON restaurant_tables, table_combinations, table_combination_members
  TO service_role;