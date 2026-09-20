-- Staff order operations for pickup orders (KLN-012, FR-ORD-11/FR-ADM-6/FR-ADM-7).
-- 1. Full legal staff transition guard replaces the guest-only guard from 0008;
--    optimistic concurrency rejects stale version writes and both attempts stay
--    in the append-only audit trail (optimistic versioning, verification
--    scenario of the ticket).
-- 2. Pickup intake pause lives in the settings table; the point of intake fails
--    closed so a paused restaurant cannot create pickup orders.
-- 3. order_status_events is append-only like audit_events.

-- Legal order map (docs/sdd/state-machines.md, orders block):
--   pending_confirmation -> accepted | rejected | cancelled
--   accepted -> preparing | cancelled
--   preparing -> ready | cancelled
--   ready -> completed | cancelled
-- Terminal states (completed/cancelled/rejected) have no outgoing edges, so
-- finished orders are immutable through the state machine.
CREATE OR REPLACE FUNCTION guard_order_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state = OLD.state THEN
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.state = 'pending_confirmation' AND NEW.state IN ('accepted', 'rejected', 'cancelled'))
    OR (OLD.state = 'accepted' AND NEW.state IN ('preparing', 'cancelled'))
    OR (OLD.state = 'preparing' AND NEW.state IN ('ready', 'cancelled'))
    OR (OLD.state = 'ready' AND NEW.state IN ('completed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'invalid order state transition: % -> %', OLD.state, NEW.state
      USING ERRCODE = 'P0001';
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

-- The trigger created in 0008 keeps pointing at the replaced function, so it is
-- the single enforcement point for direct UPDATEs on the whole table.

CREATE FUNCTION order_status_events_no_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_status_events is append-only';
END;
$$;

CREATE TRIGGER order_status_events_append_only
BEFORE UPDATE OR DELETE ON order_status_events
FOR EACH ROW EXECUTE FUNCTION order_status_events_no_mutation();

-- Accepted estimate (business-rules.md "estimated fulfilment time"); set only
-- when staff accept an order and shown by the staff and public projections.
ALTER TABLE orders ADD COLUMN accepted_estimate_minutes integer
  CHECK (accepted_estimate_minutes BETWEEN 1 AND 240);

-- Staff-applied transition with optimistic concurrency. The TS service enforces
-- the mandatory-reason/estimate business rules before calling this function.
-- Every attempt (applied, stale conflict and illegal) is written to the
-- append-only audit trail so both sides of a race stay auditable.
CREATE FUNCTION apply_order_transition(
  p_order_id uuid,
  p_expected_version integer,
  p_to_state order_state,
  p_reason text,
  p_estimate_minutes integer,
  p_actor_id uuid,
  p_correlation_id text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_version integer;
BEGIN
  SELECT * INTO v_order FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.version <> p_expected_version THEN
    INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
    VALUES (
      p_actor_id, 'order.transition.conflict', 'order', v_order.id,
      jsonb_build_object('state', v_order.state, 'version', v_order.version),
      jsonb_build_object('toState', p_to_state, 'expectedVersion', p_expected_version),
      p_correlation_id
    );
    RETURN jsonb_build_object(
      'status', 'conflict',
      'orderNumber', v_order.order_number,
      'state', v_order.state,
      'version', v_order.version
    );
  END IF;

  IF NOT (
    (v_order.state = 'pending_confirmation' AND p_to_state IN ('accepted', 'rejected', 'cancelled'))
    OR (v_order.state = 'accepted' AND p_to_state IN ('preparing', 'cancelled'))
    OR (v_order.state = 'preparing' AND p_to_state IN ('ready', 'cancelled'))
    OR (v_order.state = 'ready' AND p_to_state IN ('completed', 'cancelled'))
  ) THEN
    INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
    VALUES (
      p_actor_id, 'order.transition.invalid', 'order', v_order.id,
      jsonb_build_object('state', v_order.state, 'version', v_order.version),
      jsonb_build_object('toState', p_to_state),
      p_correlation_id
    );
    RETURN jsonb_build_object(
      'status', 'invalid',
      'orderNumber', v_order.order_number,
      'state', v_order.state,
      'version', v_order.version
    );
  END IF;

  UPDATE orders SET
    state = p_to_state,
    guest_name = CASE WHEN p_to_state = 'cancelled' THEN NULL ELSE guest_name END,
    guest_phone = CASE WHEN p_to_state = 'cancelled' THEN NULL ELSE guest_phone END,
    accepted_estimate_minutes =
      CASE WHEN p_to_state = 'accepted' THEN p_estimate_minutes ELSE accepted_estimate_minutes END,
    updated_at = now()
  WHERE id = v_order.id;

  v_new_version := v_order.version + 1;

  INSERT INTO order_status_events (order_id, from_state, to_state, reason, actor)
  VALUES (v_order.id, v_order.state, p_to_state, p_reason, p_actor_id);

  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  VALUES (
    p_actor_id, 'order.transition.apply', 'order', v_order.id,
    jsonb_build_object('state', v_order.state, 'version', v_order.version),
    jsonb_build_object('state', p_to_state, 'version', v_new_version, 'estimateMinutes', p_estimate_minutes),
    p_correlation_id
  );

  RETURN jsonb_build_object(
    'status', 'applied',
    'orderNumber', v_order.order_number,
    'state', p_to_state,
    'version', v_new_version,
    'scheduledFor', to_char(v_order.scheduled_for AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'estimateMinutes', p_estimate_minutes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_order_transition(uuid, integer, order_state, text, integer, uuid, text)
  TO service_role;

-- Manager-facing "commerce is paused" switch (authorization matrix: staff may
-- toggle availability). The value is a single settings row with an optimistic
-- version bump; the transition itself is audited.
CREATE FUNCTION set_pickup_accepting_enabled(
  p_enabled boolean,
  p_actor_id uuid,
  p_correlation_id text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_version integer;
BEGIN
  INSERT INTO settings (key, value, version, updated_by)
  VALUES ('pickup_accepting_enabled', to_jsonb(p_enabled), 1, p_actor_id)
  ON CONFLICT (key) DO UPDATE
    SET value = excluded.value,
        version = settings.version + 1,
        updated_by = excluded.updated_by,
        updated_at = now()
  RETURNING version INTO v_version;

  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  VALUES (
    p_actor_id, 'order.pickup_accepting.toggle', 'setting', 'pickup_accepting_enabled',
    NULL,
    jsonb_build_object('enabled', p_enabled, 'version', v_version),
    p_correlation_id
  );

  RETURN jsonb_build_object('enabled', p_enabled, 'version', v_version);
END;
$$;

GRANT EXECUTE ON FUNCTION set_pickup_accepting_enabled(boolean, uuid, text)
  TO service_role;

-- Fail closed at intake: a paused restaurant rejects new pickup orders in the
-- same transaction that inserts them, mirroring "ordering is rejected when
-- commerce is paused" (business-rules.md). Missing row means open.
CREATE FUNCTION guard_pickup_intake() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fulfilment = 'pickup' AND NOT COALESCE(
    (SELECT (value #>> '{}')::boolean FROM settings WHERE key = 'pickup_accepting_enabled'),
    true
  ) THEN
    RAISE EXCEPTION 'pickup orders are paused' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_pickup_intake_guard
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION guard_pickup_intake();