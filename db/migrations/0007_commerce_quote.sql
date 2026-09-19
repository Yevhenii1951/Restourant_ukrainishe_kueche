-- Commerce primitives for server-authoritative quoting (KLN-010):
-- delivery zones with exact PLZ lists, promo codes, fulfilment service
-- windows, closures and demo commerce settings. All reads happen server-side
-- via service_role; no public view is opened.

CREATE TYPE commercial_service_type AS ENUM ('pickup', 'delivery');

CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  postal_codes text[] NOT NULL CHECK (cardinality(postal_codes) > 0),
  fee_cents integer NOT NULL CHECK (fee_cents >= 0),
  minimum_cents integer NOT NULL CHECK (minimum_cents >= 0),
  free_delivery_cents integer NOT NULL CHECK (free_delivery_cents >= 0),
  active boolean NOT NULL DEFAULT true
    CHECK (NOT active OR cardinality(postal_codes) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION guard_delivery_zone_postal_codes() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  code text;
BEGIN
  FOREACH code IN ARRAY NEW.postal_codes LOOP
    IF length(code) <> 5 OR code !~ '^[0-9]{5}$' THEN
      RAISE EXCEPTION 'postal code % must be exactly five digits', code
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM unnest(NEW.postal_codes)) <>
     (SELECT count(DISTINCT p) FROM unnest(NEW.postal_codes) AS p) THEN
    RAISE EXCEPTION 'postal codes must be unique within a zone'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_zones_plz_format
BEFORE INSERT OR UPDATE ON delivery_zones
FOR EACH ROW EXECUTE FUNCTION guard_delivery_zone_postal_codes();

CREATE FUNCTION guard_delivery_zone_overlap() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.active AND EXISTS (
    SELECT 1 FROM delivery_zones AS other
    WHERE other.active
      AND other.id IS DISTINCT FROM NEW.id
      AND other.postal_codes && NEW.postal_codes
  ) THEN
    RAISE EXCEPTION 'active delivery zones must not share a postal code (pointing_plz_overlap)'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_zones_no_overlap
BEFORE INSERT OR UPDATE ON delivery_zones
FOR EACH ROW EXECUTE FUNCTION guard_delivery_zone_overlap();

CREATE TABLE promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_lookup text NOT NULL UNIQUE
    CHECK (code_lookup = upper(btrim(code_lookup))),
  code_hash text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('percent', 'fixed')),
  value_percent integer CHECK (value_percent BETWEEN 1 AND 100),
  value_cents integer CHECK (value_cents >= 0),
  minimum_subtotal_cents integer NOT NULL DEFAULT 0 CHECK (minimum_subtotal_cents >= 0),
  redemption_limit integer NOT NULL DEFAULT 0 CHECK (redemption_limit >= 0),
  redemption_count integer NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (mode = 'percent' AND value_percent IS NOT NULL AND value_cents IS NULL)
    OR (mode = 'fixed' AND value_cents IS NOT NULL AND value_percent IS NULL)
  ),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR starts_at < ends_at),
  CHECK (redemption_limit = 0 OR redemption_count <= redemption_limit)
);

CREATE TABLE service_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfilment commercial_service_type NOT NULL,
  weekday integer CHECK (weekday BETWEEN 0 AND 6),
  date_override date,
  opens_at time NOT NULL,
  closes_at time NOT NULL CHECK (closes_at > opens_at),
  capacity_per_slot integer NOT NULL CHECK (capacity_per_slot > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (weekday IS NULL AND date_override IS NOT NULL)
    OR (weekday IS NOT NULL AND date_override IS NULL)
  )
);

CREATE UNIQUE INDEX service_windows_active_override_uniq
  ON service_windows (fulfilment, date_override)
  WHERE active AND date_override IS NOT NULL;

CREATE TABLE closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  reason text NOT NULL,
  affected_services commercial_service_type[] NOT NULL
    DEFAULT ARRAY['pickup', 'delivery']::commercial_service_type[]
    CHECK (cardinality(affected_services) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by uuid REFERENCES staff_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_zones_active_idx ON delivery_zones (active);
CREATE INDEX closures_period_idx ON closures (starts_at, ends_at);
CREATE INDEX service_windows_fulfilment_idx ON service_windows (fulfilment) WHERE active;

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON delivery_zones, promo_codes, service_windows, closures, settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON delivery_zones, promo_codes, service_windows, closures, settings TO service_role;