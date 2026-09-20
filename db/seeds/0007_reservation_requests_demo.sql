-- Reservation request rules used by the transactional request function
-- (KLN-014). Demo values per business-rules "Reservations": a pending hold is
-- 30 minutes while staff review; guests may cancel until 4 hours before start.
INSERT INTO settings (key, value)
VALUES
  ('reservation_hold_minutes', '30'),
  ('reservation_cutoff_minutes', '240');