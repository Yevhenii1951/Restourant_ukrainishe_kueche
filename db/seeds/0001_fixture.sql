-- Deterministic seed: fixed values so every run produces the same state.

INSERT INTO fixture.private_secrets (id, value)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'service-only-secret-a'),
  ('00000000-0000-0000-0000-000000000002', 'service-only-secret-b');