# SDD Session State (KLN-015)

## Done
- **KLN-015 — Admin reservation operations** implemented on
  `feature/kln-015-reservation-operations`, merged via PR #20
  (`main` @ fd69723).

## Finished this session
- Migration `0012_reservation_operations.sql`: `apply_reservation_transition(...)`
  for staff operations with optimistic `version` check, invalid-transition return,
  status event + audit event writes, contact masking on declined/cancelled/expired,
  and expired-hold confirmation reallocation in one transaction. If an expired
  hold's former plan is taken, confirmation returns `no-table-available` and no
  overlapping allocation is created.
- Allocation semantics tightened: `blocked = true` now participates in
  `create_reservation_request` overlap checks and `listReservationBlocks()`, so
  released/expired allocation rows no longer block availability.
- Added `canOperateReservations` (STAFF+) for reservation queue operations while
  keeping table inventory management on `canManageReservations` (MANAGER+).
- Added reservation staff service/runtime/actions, state constants, German
  status labels, admin `/admin/reservierungen` list and
  `/admin/reservierungen/[reservationId]` detail page with transition controls
  and event history.

## Test results
- `npm run check` green: lint + typecheck + 178 unit + 79 integration.
- New KLN-015 integration (2): valid pending→confirmed transition with status
  event + audit; stale version conflict; invalid transition; expired hold with
  former table plan taken returns `no-table-available`, keeps the original
  reservation unchanged and leaves only the competing reservation blocking the
  tables.

## Next steps
- KLN-016 delivery checkout is next if continuing numeric ticket order.
- KLN-017..028 out of scope.

## Env
- `npm run check` local green on `kalyna_test`; main @ fd69723.
