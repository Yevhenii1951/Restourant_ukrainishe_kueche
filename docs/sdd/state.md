# SDD Session State (KLN-014)

## Done
- **KLN-014 — Pending reservation request** implemented on
  `feature/kln-014-reservation-request`, merged via PR #19
  (`main` @ cbabb78).

## Finished this session
- Migration `0011_reservations.sql`: `reservation_state` enum;
  `reservations` (token/idempotency hashes unique, guest contact **nullable**
  so cancellation masks it, schedule index, `version`), `reservation_allocations`
  (partial GiST exclusion constraint on blocking ranges = the AC-3 real guard,
  needs `btree_gist`), `reservation_status_events` (append-only audit);
  `guard_reservation_status()` trigger with the full legal map
  (pending→confirmed|declined|cancelled|expired; confirmed→cancelled|
  completed|no_show) bumping `version`; transactional
  `create_reservation_request` (idempotent replay first, conflict on changed
  payload, rules re-checked inside the txn: notice/party cap/duration/window/
  closure, then smallest-fit allocation — combos before singles, exception on
  `exclusion_violation` tries the next plan), `cancel_reservation` (NULL for
  unknown/terminal, cutoff-passed outcome, contact mask), `expire_reservations`
  (idempotent). RLS + revoke for anon/authenticated, execute grants only to
  `service_role` (also revoked from PUBLIC).
- Seed `0007_reservation_requests_demo.sql`: hold 30 min, cutoff 240 min
  (plain INSERT style, matching 0005/0006).
- `src/features/reservation/`: `request.ts` (strict Zod schema, deterministic
  HMAC public token — raw token never stored, stable fingerprint),
  `requestRuntime.ts` (raw-`pg` Pool ≤5 + `QUOTE_SIGNING_SECRET`, mirrors
  order/runtime), `requestService.ts` (created/rejected/conflict mapping;
  availability re-validated per request including real pending/confirmed
  `blocks`; a recoverable no-slot shows from the previous hold still reaches
  the DB so replay resolves), `requestActions.ts` (raw-union returns, not
  ActionResult — matches order/actions).
- `store.ts`/`supabaseReservationStore.ts`: `listReservationBlocks()`
  (pending/confirmed allocations as `BlockingIntervalInput`) feeds the
  `ReservationReadStore` Pick and `getReservationSlotsFromStore`.
- Public UI: `/reservierung` booking flow (slot → contact/privacy form with
  `crypto.randomUUID` idempotency key, server-action form handler) + new
  status/cancel page `/reservierung/[token]` (noindex, force-dynamic) with
  client `CancelReservationButton`. i18n `reservierung` extended (de/en/uk).
- **Bug the tests caught**: the allocation `SELECT (v_id, unnest(...), ...)`
  row constructor produced ONE composite column → `INSERT hat mehr Zielspalten
  als Ausdrücke`; removed the parens in both loops.

## Test results
- `npm run check` green: lint + typecheck + 178 unit + 77 integration.
- New unit (8): schema rules, deterministic token/hash, key-order-independent
  fingerprint. New integration (11): AC-3 concurrency (two real transactions on
  a single-plan party-10 slot; exactly one created, the other
  `no-table-available`, exactly 2 allocation rows), idempotent replay + conflict,
  notice/party-cap/duration-mismatch, outside-hours, closure, cancel+mask+version
  bump+replay-neutral, cutoff-passed, idempotent expiry, illegal-transition
  guard, anon SELECT + function denial, full service-layer flow
  (created/replayed/privacy/slot). Each creating test uses its own future slot
  to avoid interference.

## Next steps
- KLN-015 reservations (staff confirmation queue/calendar and transition
  workflow); migration 0011 already carries the full state map + audit rows.
- KLN-016..028 out of scope.

## Env
- `npm run check` local green on `kalyna_test`; main @ cbabb78.