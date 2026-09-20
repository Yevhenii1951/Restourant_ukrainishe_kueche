# SDD Session State (KLN-012)

## Done
- **KLN-012 — Admin Order Operations** implemented on
  `feature/kln-012-order-operations` (base = main@66e4ba4 with KLN-011 merged).

## Finished this session
- Migration `0009_order_operations.sql`: full legal state guard
  (pending→accepted|rejected|cancelled; accepted→preparing|cancelled;
  preparing→ready|cancelled; ready→completed|cancelled; terminal states
  immutable), `accepted_estimate_minutes` (1..240), `apply_order_transition()`
  with optimistic versioning (stale → `conflict`, illegal → `invalid`; every
  attempt written to append-only audit_events), `set_pickup_accepting_enabled()`
  (settings `pickup_accepting_enabled`, audited toggle), pick-up intake guard
  (`pickup orders are paused`, fail closed), append-only trigger for
  `order_status_events`.
- Pure `src/features/order/transitions.ts` (ORDER_STATES/ORDER_TRANSITIONS,
  client-safe, no node:crypto) re-exported from `domain.ts`; added
  `transitionOrderSchema`/`transitionValidation` (reason required for
  cancel/reject, estimate 1..240 for accept) + staff projections.
- `staffService.ts` (pure, DatabaseRunner) — queue, detail, transition, toggle,
  CSV export (MANAGER+ gate; formula-injection escaping); `staffRuntime.ts`
  (server-only pool + session), `staffActions.ts` (OrderActionResult);
  `runtime.ts` now exports `getPool()`. `identity/domain.ts` gained
  `canExportCustomerData` (MANAGER+).
- `createPickupOrder` returns `pickup-paused` when intake guard fires;
  CheckoutForm + `bestellen.pickupPaused` in de/en/uk.
- Admin UI (German literals, mobile-first): `/admin/bestellungen` queue +
  `/admin/bestellungen/[orderId]` detail with `AvailabilityToggle`,
  `ExportCsvButton`, `OrderTransitionControls` (legal targets from map), nav
  link in admin layout.
- Tests: `kln012-order-domain.test.ts`, `kln012-staff-service.test.ts` (unit),
  `kln012-orders-operations.test.ts` (integration: optimistic-versioning
  verification scenario — stale cancel → conflict, both attempts audited,
  contact masked on cancel, append-only, paused intake, anon denied).
  KLN-011 guard test updated: pending→accepted is now legal (full map),
  illegal edge `completed` still blocked.
- `npm run check` green (lint/typecheck/unit/integration).

## Decision recorded
- Availability toggle is STAFF+ (authorization-matrix.md, not the manager-only
  state.md draft); CSV export stays MANAGER+ via `canExportCustomerData`.

## Next steps
- KLN-012 PR: merge after `npm run check` green (already done → open + merge PR).
- KLN-013..015 reservations (out of scope for this session).

## Env
- `npm run check` local green on `kalyna_test`.