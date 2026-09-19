-- Demo commerce settings and quote primitives (KLN-010).
-- German market: pickup min EUR 0.00; delivery min/free per zone.
-- Code_hash stores sha256(code_lookup) computed in the application layer.

INSERT INTO settings (key, value)
VALUES
  ('pickup_minimum_cents', '0'),
  ('asap_lead_minutes', '30'),
  ('scheduling_horizon_days', '14'),
  ('slot_interval_minutes', '15'),
  ('max_line_quantity', '20');

INSERT INTO delivery_zones
  (id, name, postal_codes, fee_cents, minimum_cents, free_delivery_cents, active)
VALUES
  ('61000000-0000-0000-0000-000000000001', 'Kassel',
   ARRAY['34117','34119','34121','34123','34125','34127','34128','34130','34131','34132','34134'],
   390, 1500, 3000, true),
  ('61000000-0000-0000-0000-000000000002', 'Göttingen',
   ARRAY['37073','37075','37077','37079','37081','37083','37085'],
   590, 2000, 3500, true);

INSERT INTO promo_codes
  (id, code_lookup, code_hash, mode, value_percent, value_cents, minimum_subtotal_cents,
   redemption_limit, starts_at, ends_at, active)
VALUES
  ('62000000-0000-0000-0000-000000000001', 'WELCOME10',
   '22b0493861832fff303c27eb48a8c1436174fb13675ced0361a01ae698154379',
   'percent', 10, NULL, 1500, 1000,
   now() - interval '1 day', now() + interval '30 days', true),
  ('62000000-0000-0000-0000-000000000002', 'SOMMER500',
   'd68ddce943275493c7df0e7fdc46ec6fc2bf61ac3ad0bd497c8809543ae4cf18',
   'fixed', NULL, 500, 2000, 500,
   now() - interval '1 day', now() + interval '60 days', true);

-- Pickup daily 11:30-22:00, delivery Mon-Sat 11:30-21:30, capacity 8 per slot.

INSERT INTO service_windows
  (id, fulfilment, weekday, opens_at, closes_at, capacity_per_slot, active)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'pickup', 0, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000002', 'pickup', 1, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000003', 'pickup', 2, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000004', 'pickup', 3, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000005', 'pickup', 4, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000006', 'pickup', 5, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000007', 'pickup', 6, '11:30', '22:00', 8, true),
  ('70000000-0000-0000-0000-000000000008', 'delivery', 1, '11:30', '21:30', 8, true),
  ('70000000-0000-0000-0000-000000000009', 'delivery', 2, '11:30', '21:30', 8, true),
  ('70000000-0000-0000-0000-000000000010', 'delivery', 3, '11:30', '21:30', 8, true),
  ('70000000-0000-0000-0000-000000000011', 'delivery', 4, '11:30', '21:30', 8, true),
  ('70000000-0000-0000-0000-000000000012', 'delivery', 5, '11:30', '21:30', 8, true),
  ('70000000-0000-0000-0000-000000000013', 'delivery', 6, '11:30', '21:30', 8, true);

INSERT INTO closures
  (id, starts_at, ends_at, reason, affected_services)
VALUES
  ('71000000-0000-0000-0000-000000000001',
   '2027-12-24 09:00:00+01', '2027-12-24 23:00:00+01',
   'Heiligabend (Demo)', ARRAY['pickup', 'delivery']::commercial_service_type[]);