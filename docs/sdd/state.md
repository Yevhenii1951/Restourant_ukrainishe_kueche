# SDD Session State (KLN-013)

## Done
- **KLN-013 — Table inventory and availability** implemented on
  `feature/kln-013-reservation-availability`, merged via PR #18
  (`main` @ c8b6c37).

## Finished this session
- Migration `0010_reservation_availability.sql`: `commercial_service_type`
  gains `reservation` (enum value must not be used inside the migration
  transaction — ALTER TYPE ADD VALUE limitation; demo rows live in seed 0006);
  `restaurant_tables`, `table_combinations` (capacity NULL until members exist),
  `table_combination_members`; DB triggers recompute combination capacity from
  the **active** member tables (never 0, NULL when none); RLS + revoke for
  anon/authenticated, full grants to `service_role`.
- Seed `0006_reservation_demo.sql`: rules (duration 120, horizon 90 d, notice
  120 min, 15-min grid, max party 12), reservation windows daily 12:00–23:00,
  summer-pause closure (also affects reservation), 4 demo tables, 2 combos.
- `src/features/reservation/*`: `domain.ts` (Zod schemas,
  `validateCombination` ≥2 distinct active tables, `buildAllocationOptions`,
  `selectSmallestPlan` — combinations win capacity ties), `slots.ts`
  (DST-safe half-open builder, per-table blocks, notice filter),
  `store.ts`/`supabaseReservationStore.ts` (read + save, server-only),
  `availability.ts` (pure `getReservationSlotsFromStore`,
  `ReservationReadStore`, `blocks` reserved for KLN-014),
  `service.ts`/`actions.ts` (env-guarded), `staffActions.ts` (manager-only
  CRUD + audit events; NOT_FOUND removed — not in ActionResult union).
- `quote/slots.ts` now exports `berlinLocalToUtcMs`; `identity/domain.ts` gained
  `canManageReservations` (MANAGER+).
- Admin UI (German literals): `/admin/tische`, `/admin/kombinationen` + edit
  pages; client components `TableForm`/`TableRowToggle`/`CombinationForm`/
  `CombinationRowToggle` (raw server-action forms fail TS — handlers must
  return `Promise<void>`); nav links in admin layout.
- Public `/reservierung` + `ReservationAvailability.tsx`: slots expose only
  `startUtc` + `labelLocal`, no table identities; `min` date memoized
  (react-hooks/purity). i18n `reservierung` namespace (de/en/uk).

## Test results
- `npm run check` green: lint + typecheck + 170 unit + 66 integration.
  New unit (8) + integration (5): half-open closure removes the overlap window
  (12:15–14:45 blocked, 12:00 stays), DST spring/autumn, anon/authenticated RLS
  denial, DB-computed combo capacity on table deactivate/restore, party cap,
  slot privacy. Tests use a pool-backed `ReservationReadStore`.
- Gotcha: test DB error messages are German — assert
  `/keine Berechtigung|permission denied/i`; RLS rules reject `service_role`
  sessions without JWT claims → interactive writes go through the owner pool.

## Next steps
- KLN-014..015 reservations (persistence, allocation, cutoff/hold, booking);
  the `blocks` parameter of `getReservationSlotsFromStore` is the seam.
- KLN-016..028 out of scope.

## Env
- `npm run check` local green on `kalyna_test`; main @ c8b6c37.