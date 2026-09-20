-- Pending reservation request with concurrency-safe allocation (KLN-014,
-- FR-RES-3/4/7, AC-3/4). One transaction allocates the smallest available
-- table plan to an immutable reservation row and writes an append-only status
-- event. Overlap of blocking allocations is enforced by a partial GiST
-- exclusion constraint (the real AC-3 guard under concurrency) plus a
-- check-then-insert loop inside the function. The raw public token is never
-- stored: only its sha256. Contact columns are masked on guest cancellation
-- and never exposed via public projections (RLS + projection).
-- Confirmation/decline/no-show transitions arrive with KLN-015; the legal
-- state map is already complete so staff actions reuse it.

CREATE TYPE reservation_state AS ENUM (
  'pending', 'confirmed', 'declined', 'cancelled', 'expired', 'completed', 'no_show'
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  public_token_hash text NOT NULL UNIQUE,
  idempotency_hash text NOT NULL UNIQUE,
  request_hash text NOT NULL,
  -- Guest contact is nullable: cancellation/decline mask it (AC-4, GDPR).
  guest_name text
    CHECK (guest_name IS NULL OR length(btrim(guest_name)) BETWEEN 1 AND 80),
  guest_email text
    CHECK (guest_email IS NULL OR (guest_email = btrim(guest_email) AND guest_email LIKE '%@%' AND length(guest_email) <= 254)),
  guest_phone text
    CHECK (guest_phone IS NULL OR length(btrim(guest_phone)) BETWEEN 3 AND 30),
  privacy_version text NOT NULL,
  party_size integer NOT NULL CHECK (party_size BETWEEN 1 AND 12),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  status reservation_state NOT NULL DEFAULT 'pending',
  seating_preference text CHECK (seating_preference IS NULL OR length(seating_preference) <= 120),
  notes text CHECK (notes IS NULL OR length(notes) <= 500),
  -- Pending holds expire after the configured hold window (staff review).
  expires_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reservation_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  blocked boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX reservation_allocations_res_table_idx
  ON reservation_allocations (reservation_id, table_id);
CREATE INDEX reservation_allocations_table_idx
  ON reservation_allocations (table_id, starts_at, ends_at);
CREATE INDEX reservations_schedule_idx ON reservations (starts_at, ends_at, status);

CREATE TABLE reservation_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  from_status reservation_state,
  to_status reservation_state NOT NULL,
  reason text,
  actor uuid REFERENCES staff_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reservation_status_events_reservation_idx
  ON reservation_status_events (reservation_id);

-- AC-3 at the database level: a blocking (pending/confirmed) allocation can
-- never overlap another allocation of the same table. Two concurrent requests
-- racing the check-then-insert path are resolved here, not in application code.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservation_allocations
  ADD CONSTRAINT reservation_allocations_no_overlap
  EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (blocked);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON reservations, reservation_allocations, reservation_status_events
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE
  ON reservations, reservation_allocations, reservation_status_events
  TO service_role;

CREATE TRIGGER reservations_touch_updated
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Complete legal state map (FR-RES-5). KLN-014 uses pending -> cancelled and
-- pending -> expired; the staff edges are exercised from KLN-015.
CREATE FUNCTION guard_reservation_status() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'declined', 'cancelled', 'expired')) OR
    (OLD.status = 'confirmed' AND NEW.status IN ('cancelled', 'completed', 'no_show'))
  ) THEN
    RAISE EXCEPTION 'invalid reservation status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_status_guard
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION guard_reservation_status();

-- Transactional pending request. Returns a safe jsonb outcome; the raw public
-- token is generated and shown to the guest only in server code, never stored.
CREATE FUNCTION create_reservation_request(
  p_public_token_hash text,
  p_idempotency_hash text,
  p_request_hash text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_privacy_version text,
  p_party_size integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_seating_preference text,
  p_notes text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  v_duration_min integer;
  v_notice_min integer;
  v_max_party integer;
  v_hold_min integer;
  v_expires timestamptz;
  v_local_start time;
  v_local_end time;
  v_berlin_date date;
  v_number bigint;
  v_replay reservations%ROWTYPE;
  v_plan record;
  v_allocated boolean := false;
BEGIN
  -- Idempotent replay: same key + same payload borrows the original hold; a
  -- different payload with that key is a client conflict.
  SELECT * INTO v_replay FROM reservations
  WHERE idempotency_hash = p_idempotency_hash FOR UPDATE;
  IF FOUND THEN
    IF v_replay.request_hash <> p_request_hash THEN
      RETURN jsonb_build_object('outcome', 'conflict');
    END IF;
    RETURN jsonb_build_object(
      'outcome', 'replayed',
      'reservationId', v_replay.id,
      'number', v_replay.reservation_number,
      'status', v_replay.status,
      'startsAt', to_char(v_replay.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'endsAt', to_char(v_replay.ends_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'expiresAt', to_char(v_replay.expires_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'partySize', v_replay.party_size
    );
  END IF;

  -- Rules re-validated inside the transaction (business-rules "Reservations").
  SELECT
    (SELECT value::integer FROM settings WHERE key = 'reservation_duration_minutes'),
    (SELECT value::integer FROM settings WHERE key = 'reservation_notice_minutes'),
    (SELECT value::integer FROM settings WHERE key = 'reservation_max_party'),
    (SELECT value::integer FROM settings WHERE key = 'reservation_hold_minutes')
  INTO v_duration_min, v_notice_min, v_max_party, v_hold_min;

  IF v_duration_min IS NULL OR v_notice_min IS NULL OR v_max_party IS NULL OR v_hold_min IS NULL THEN
    RETURN jsonb_build_object('outcome', 'rejected', 'reason', 'misconfigured');
  END IF;
  IF p_party_size > v_max_party OR p_party_size < 1 THEN
    RETURN jsonb_build_object('outcome', 'rejected', 'reason', 'party-too-large');
  END IF;
  IF (extract(epoch FROM (p_ends_at - p_starts_at)) / 60)::integer <> v_duration_min THEN
    RETURN jsonb_build_object('outcome', 'rejected', 'reason', 'duration-mismatch');
  END IF;
  IF p_starts_at < now() + make_interval(mins => v_notice_min) THEN
    RETURN jsonb_build_object('outcome', 'rejected', 'reason', 'below-notice');
  END IF;

  v_berlin_date := (p_starts_at AT TIME ZONE 'Europe/Berlin')::date;
  v_local_start := (p_starts_at AT TIME ZONE 'Europe/Berlin')::time;
  v_local_end := (p_ends_at AT TIME ZONE 'Europe/Berlin')::time;

  -- A closure overriding the slot wins, even when the window row is active.
  IF EXISTS (
    SELECT 1 FROM closures c
    WHERE 'reservation' = ANY(c.affected_services)
      AND c.starts_at < p_ends_at AND p_starts_at < c.ends_at
  ) THEN
    RETURN jsonb_build_object('outcome', 'rejected', 'reason', 'closed');
  END IF;

  -- The reserved span sits inside an active opening window for that Berlin
  -- date; a date override replaces the weekday row (business rule).
  IF NOT EXISTS (
    SELECT 1 FROM service_windows w
    WHERE w.fulfilment = 'reservation' AND w.active
      AND (
        w.date_override = v_berlin_date
        OR (w.date_override IS NULL AND w.weekday = extract(dow FROM v_berlin_date))
      )
      AND v_local_start >= w.opens_at
      AND v_local_end <= w.closes_at
  ) THEN
    RETURN jsonb_build_object('outcome', 'rejected', 'reason', 'outside-hours');
  END IF;

  v_expires := now() + make_interval(mins => v_hold_min);

  INSERT INTO reservations (
    public_token_hash, idempotency_hash, request_hash,
    guest_name, guest_email, guest_phone, privacy_version,
    party_size, starts_at, ends_at, seating_preference, notes, expires_at
  ) VALUES (
    p_public_token_hash, p_idempotency_hash, p_request_hash,
    p_guest_name, p_guest_email, p_guest_phone, p_privacy_version,
    p_party_size, p_starts_at, p_ends_at, p_seating_preference, p_notes, v_expires
  )
  RETURNING id, reservation_number INTO v_id, v_number;

  -- Smallest-fit allocation: combinations first (they win capacity ties so a
  -- standalone table stays free), then single tables. Every plan is
  -- pre-checked for overlap and, if a concurrent transaction slipped through
  -- the check, the exclusion constraint rejects it and we try the next plan.
  FOR v_plan IN
    SELECT c.id AS combination_id,
           array_agg(m.table_id ORDER BY m.table_id) AS tables,
           sum(t.capacity) AS capacity
    FROM table_combinations c
    JOIN table_combination_members m ON m.combination_id = c.id
    JOIN restaurant_tables t ON t.id = m.table_id AND t.active
    WHERE c.active
    GROUP BY c.id
    HAVING count(*) >= 2 AND sum(t.capacity) >= p_party_size
    ORDER BY sum(t.capacity) ASC, c.id ASC
  LOOP
    BEGIN
      INSERT INTO reservation_allocations (reservation_id, table_id, starts_at, ends_at, blocked)
      SELECT v_id, unnest(v_plan.tables), p_starts_at, p_ends_at, true
      WHERE NOT EXISTS (
        SELECT 1 FROM reservation_allocations a
        JOIN reservations r ON r.id = a.reservation_id
        WHERE r.status IN ('pending', 'confirmed')
          AND a.blocked
          AND a.table_id = ANY(v_plan.tables)
          AND a.starts_at < p_ends_at AND p_starts_at < a.ends_at
      );
      IF FOUND THEN
        v_allocated := true;
        EXIT;
      END IF;
    EXCEPTION WHEN exclusion_violation THEN
      NULL;
    END;
  END LOOP;

  IF NOT v_allocated THEN
    FOR v_plan IN
      SELECT t.id AS combination_id,
             ARRAY[t.id] AS tables,
             t.capacity AS capacity
      FROM restaurant_tables t
      WHERE t.active AND t.capacity >= p_party_size
      ORDER BY t.capacity ASC, t.id ASC
    LOOP
      BEGIN
        INSERT INTO reservation_allocations (reservation_id, table_id, starts_at, ends_at, blocked)
        SELECT v_id, unnest(v_plan.tables), p_starts_at, p_ends_at, true
        WHERE NOT EXISTS (
          SELECT 1 FROM reservation_allocations a
          JOIN reservations r ON r.id = a.reservation_id
          WHERE r.status IN ('pending', 'confirmed')
            AND a.blocked
            AND a.table_id = ANY(v_plan.tables)
            AND a.starts_at < p_ends_at AND p_starts_at < a.ends_at
        );
        IF FOUND THEN
          v_allocated := true;
          EXIT;
        END IF;
      EXCEPTION WHEN exclusion_violation THEN
        NULL;
      END;
    END LOOP;
  END IF;

  IF NOT v_allocated THEN
    RETURN jsonb_build_object(
      'outcome', 'rejected',
      'reason', 'no-table-available',
      'reservationId', v_id
    );
  END IF;

  INSERT INTO reservation_status_events (reservation_id, from_status, to_status, reason)
  VALUES (v_id, NULL, 'pending', 'guest_created');

  RETURN jsonb_build_object(
    'outcome', 'created',
    'reservationId', v_id,
    'number', v_number,
    'status', 'pending',
    'startsAt', to_char(p_starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'endsAt', to_char(p_ends_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'expiresAt', to_char(v_expires AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'partySize', p_party_size
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_reservation_request(
  text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text, text
) TO service_role;
REVOKE EXECUTE ON FUNCTION create_reservation_request(
  text, text, text, text, text, text, text, integer, timestamptz, timestamptz, text, text
) FROM PUBLIC;

-- Guest cancellation subject to the configured cutoff (Europe/Berlin). Safe:
-- unknown tokens, already-terminal states and post-cutoff requests all return
-- a neutral outcome and never leak whether a token differs in shape (AC-4).
CREATE FUNCTION cancel_reservation(
  p_token_hash text,
  p_cutoff_minutes integer
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_reservation reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_reservation FROM reservations
  WHERE public_token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND OR v_reservation.status NOT IN ('pending', 'confirmed') THEN
    RETURN NULL;
  END IF;

  IF now() >= v_reservation.starts_at - make_interval(mins => p_cutoff_minutes) THEN
    RETURN jsonb_build_object(
      'outcome', 'cutoff-passed',
      'number', v_reservation.reservation_number,
      'status', v_reservation.status,
      'startsAt', to_char(v_reservation.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS')
    );
  END IF;

  UPDATE reservations
  SET status = 'cancelled',
      guest_name = NULL, guest_email = NULL, guest_phone = NULL
  WHERE id = v_reservation.id;

  INSERT INTO reservation_status_events (reservation_id, from_status, to_status, reason)
  VALUES (v_reservation.id, v_reservation.status, 'cancelled', 'guest_cancelled');

  RETURN jsonb_build_object(
    'outcome', 'cancelled',
    'number', v_reservation.reservation_number,
    'status', 'cancelled',
    'startsAt', to_char(v_reservation.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'endsAt', to_char(v_reservation.ends_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'partySize', v_reservation.party_size
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_reservation(text, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION cancel_reservation(text, integer) FROM PUBLIC;

-- Expire stale pending holds idempotently. Runs from the retention job
-- (KLN-025); exposed and tested here. A second run touches nothing.
CREATE FUNCTION expire_reservations() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM reservations
    WHERE status = 'pending' AND expires_at < now()
    FOR UPDATE
  LOOP
    UPDATE reservations SET status = 'expired' WHERE id = v_id;
    INSERT INTO reservation_status_events (reservation_id, from_status, to_status, reason)
    VALUES (v_id, 'pending', 'expired', 'hold_expired');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_reservations() TO service_role;
REVOKE EXECUTE ON FUNCTION expire_reservations() FROM PUBLIC;
