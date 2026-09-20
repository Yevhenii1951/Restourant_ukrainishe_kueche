-- Demo reservation configuration and table inventory (KLN-013).
-- Values are fictional Demo-Restaurant data; the real restaurant decides its
-- own tables, hours and rules later. duration/horizon/notice and the party
-- cap come from the business-rules "Reservations" defaults; the slot interval
-- matches the other demo services. cutoff/hold are added with KLN-014.

INSERT INTO settings (key, value)
VALUES
  ('reservation_duration_minutes', '120'),
  ('reservation_horizon_days', '90'),
  ('reservation_notice_minutes', '120'),
  ('reservation_slot_interval_minutes', '15'),
  ('reservation_max_party', '12');

-- Reservations are taken daily 12:00-23:00. capacity_per_slot is required by
-- service_windows but unused for reservations: seats come from the tables.
INSERT INTO service_windows
  (id, fulfilment, weekday, opens_at, closes_at, capacity_per_slot, active)
VALUES
  ('00000000-0000-0000-0000-0000000000d0', 'reservation', 0, '12:00', '23:00', 1, true),
  ('00000000-0000-0000-0000-0000000000d1', 'reservation', 1, '12:00', '23:00', 1, true),
  ('00000000-0000-0000-0000-0000000000d2', 'reservation', 2, '12:00', '23:00', 1, true),
  ('00000000-0000-0000-0000-0000000000d3', 'reservation', 3, '12:00', '23:00', 1, true),
  ('00000000-0000-0000-0000-0000000000d4', 'reservation', 4, '12:00', '23:00', 1, true),
  ('00000000-0000-0000-0000-0000000000d5', 'reservation', 5, '12:00', '23:00', 1, true),
  ('00000000-0000-0000-0000-0000000000d6', 'reservation', 6, '12:00', '23:00', 1, true);

-- Demo summer pause also affects reservations.
INSERT INTO closures
  (id, starts_at, ends_at, reason, affected_services)
VALUES
  ('81000000-0000-0000-0000-000000000001',
   '2026-08-10 09:00:00+02', '2026-08-12 23:00:00+02',
   'Sommerpause (Demo)',
   ARRAY['pickup', 'delivery', 'reservation']::commercial_service_type[]);

-- Demo table inventory: four tables across two areas.
INSERT INTO restaurant_tables
  (id, internal_label, capacity, area, active)
VALUES
  ('80000000-0000-0000-0000-000000000001', 'Fenster 2', 2, 'Saal', true),
  ('80000000-0000-0000-0000-000000000002', 'Fenster 4', 4, 'Saal', true),
  ('80000000-0000-0000-0000-000000000003', 'Loggia 4', 4, 'Loggia', true),
  ('80000000-0000-0000-0000-000000000004', 'Loggia 6', 6, 'Loggia', true);

-- Two combinations; capacities are computed by the database trigger.
INSERT INTO table_combinations
  (id, name, active)
VALUES
  ('82000000-0000-0000-0000-000000000001', 'Saal Fenster', true),
  ('82000000-0000-0000-0000-000000000002', 'Loggia gross', true);

INSERT INTO table_combination_members (combination_id, table_id)
VALUES
  ('82000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002'),
  ('82000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003'),
  ('82000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000004');