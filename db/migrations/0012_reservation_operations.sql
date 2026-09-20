-- Staff-facing reservation transitions (KLN-015).

CREATE FUNCTION apply_reservation_transition(
  p_reservation_id uuid,
  p_expected_version integer,
  p_to_status reservation_state,
  p_reason text,
  p_actor_id uuid,
  p_correlation_id text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_reservation reservations%ROWTYPE;
  v_new_version integer;
  v_plan record;
  v_allocated boolean := false;
BEGIN
  SELECT * INTO v_reservation FROM reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_reservation.version <> p_expected_version THEN
    INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
    VALUES (
      p_actor_id, 'reservation.transition.conflict', 'reservation', v_reservation.id,
      jsonb_build_object('status', v_reservation.status, 'version', v_reservation.version),
      jsonb_build_object('toStatus', p_to_status, 'expectedVersion', p_expected_version),
      p_correlation_id
    );
    RETURN jsonb_build_object(
      'status', 'conflict',
      'number', v_reservation.reservation_number,
      'reservationStatus', v_reservation.status,
      'version', v_reservation.version
    );
  END IF;

  IF NOT (
    (v_reservation.status = 'pending' AND p_to_status IN ('confirmed', 'declined', 'cancelled', 'expired')) OR
    (v_reservation.status = 'confirmed' AND p_to_status IN ('cancelled', 'completed', 'no_show'))
  ) THEN
    INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
    VALUES (
      p_actor_id, 'reservation.transition.invalid', 'reservation', v_reservation.id,
      jsonb_build_object('status', v_reservation.status, 'version', v_reservation.version),
      jsonb_build_object('toStatus', p_to_status),
      p_correlation_id
    );
    RETURN jsonb_build_object(
      'status', 'invalid',
      'number', v_reservation.reservation_number,
      'reservationStatus', v_reservation.status,
      'version', v_reservation.version
    );
  END IF;

  IF v_reservation.status = 'pending' AND p_to_status = 'confirmed'
     AND v_reservation.expires_at < now() THEN
    UPDATE reservation_allocations
    SET blocked = false
    WHERE reservation_id = v_reservation.id;

    FOR v_plan IN
      SELECT c.id AS combination_id,
             array_agg(m.table_id ORDER BY m.table_id) AS tables,
             sum(t.capacity) AS capacity
      FROM table_combinations c
      JOIN table_combination_members m ON m.combination_id = c.id
      JOIN restaurant_tables t ON t.id = m.table_id AND t.active
      WHERE c.active
      GROUP BY c.id
      HAVING count(*) >= 2 AND sum(t.capacity) >= v_reservation.party_size
      ORDER BY sum(t.capacity) ASC, c.id ASC
    LOOP
      BEGIN
        INSERT INTO reservation_allocations (reservation_id, table_id, starts_at, ends_at, blocked)
        SELECT v_reservation.id, unnest(v_plan.tables), v_reservation.starts_at, v_reservation.ends_at, true
        WHERE NOT EXISTS (
          SELECT 1 FROM reservation_allocations a
          JOIN reservations r ON r.id = a.reservation_id
          WHERE r.status IN ('pending', 'confirmed')
            AND a.blocked
            AND a.reservation_id <> v_reservation.id
            AND a.table_id = ANY(v_plan.tables)
            AND a.starts_at < v_reservation.ends_at
            AND v_reservation.starts_at < a.ends_at
        )
        ON CONFLICT (reservation_id, table_id) DO UPDATE
          SET starts_at = excluded.starts_at,
              ends_at = excluded.ends_at,
              blocked = excluded.blocked;
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
        SELECT t.id AS combination_id, ARRAY[t.id] AS tables, t.capacity AS capacity
        FROM restaurant_tables t
        WHERE t.active AND t.capacity >= v_reservation.party_size
        ORDER BY t.capacity ASC, t.id ASC
      LOOP
        BEGIN
          INSERT INTO reservation_allocations (reservation_id, table_id, starts_at, ends_at, blocked)
          SELECT v_reservation.id, unnest(v_plan.tables), v_reservation.starts_at, v_reservation.ends_at, true
          WHERE NOT EXISTS (
            SELECT 1 FROM reservation_allocations a
            JOIN reservations r ON r.id = a.reservation_id
            WHERE r.status IN ('pending', 'confirmed')
              AND a.blocked
              AND a.reservation_id <> v_reservation.id
              AND a.table_id = ANY(v_plan.tables)
              AND a.starts_at < v_reservation.ends_at
              AND v_reservation.starts_at < a.ends_at
          )
          ON CONFLICT (reservation_id, table_id) DO UPDATE
            SET starts_at = excluded.starts_at,
                ends_at = excluded.ends_at,
                blocked = excluded.blocked;
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
        'status', 'no-table-available',
        'number', v_reservation.reservation_number,
        'reservationStatus', v_reservation.status,
        'version', v_reservation.version
      );
    END IF;
  END IF;

  UPDATE reservations
  SET status = p_to_status,
      guest_name = CASE WHEN p_to_status IN ('declined', 'cancelled', 'expired') THEN NULL ELSE guest_name END,
      guest_email = CASE WHEN p_to_status IN ('declined', 'cancelled', 'expired') THEN NULL ELSE guest_email END,
      guest_phone = CASE WHEN p_to_status IN ('declined', 'cancelled', 'expired') THEN NULL ELSE guest_phone END
  WHERE id = v_reservation.id;

  v_new_version := v_reservation.version + 1;

  INSERT INTO reservation_status_events (reservation_id, from_status, to_status, reason, actor)
  VALUES (v_reservation.id, v_reservation.status, p_to_status, p_reason, p_actor_id);

  INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
  VALUES (
    p_actor_id, 'reservation.transition.apply', 'reservation', v_reservation.id,
    jsonb_build_object('status', v_reservation.status, 'version', v_reservation.version),
    jsonb_build_object('status', p_to_status, 'version', v_new_version),
    p_correlation_id
  );

  RETURN jsonb_build_object(
    'status', 'applied',
    'number', v_reservation.reservation_number,
    'reservationStatus', p_to_status,
    'version', v_new_version,
    'startsAt', to_char(v_reservation.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD"T"HH24:MI:SS')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_reservation_transition(uuid, integer, reservation_state, text, uuid, text)
  TO service_role;
REVOKE EXECUTE ON FUNCTION apply_reservation_transition(uuid, integer, reservation_state, text, uuid, text)
  FROM PUBLIC;
