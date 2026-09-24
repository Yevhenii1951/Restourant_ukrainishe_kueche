# KLN-033 – Staff/Admin runtime on pg-pool store (Prod-Parity)

**Branch:** `feature/kln-033-pool-staff-admin`

## Problem
On the Vercel+Supabase deployment the remote schema (created without
`bootstrap_roles.sql`) lacks PostgREST grants/embed support (PGRST108 /
42501). Reservation customer flow was already fixed (KLN-031) by switching to
the pg-pool store — the pool role is `postgres.<ref>` (bypasses RLS) on
Vercel, so it works without grants. The staff/admin layer still uses the
Supabase (PostgREST) stores → staff login gate, staff CRUD, content editor,
tische/kombinationen CRUD, closures, delivery zones/windows all fail or render
empty on prod.

## Change
Convert the remaining Supabase-store consumers to **pool-first**
(PostgREST/Supabase only as fallback when no `DATABASE_URL`), same convention
as `order/runtime.ts`, `admin/runtime.ts`, `quote/service.ts` (KLN-031):

- `identity/postgresStaffStore.ts` — pool-aware factory (acquires a dedicated
  client per operation to keep BEGIN/COMMIT semantics).
- `identity/session.ts` + `identity/staffActions.ts` — resolve staff via the
  pool store (auth still via Supabase Auth JWT; `auth.admin` calls stay).
- `content/contentActions.ts` + `admin/inhalte` page — pool content store.
- `reservation/postgresReservationStore.ts` — add `saveTable`/`saveCombination`
  (previously only supabase store had them).
- `reservation/staffActions.ts` + `admin/tische`, `admin/kombinationen` — pool
  store.
- `admin/closureActions.ts` + `admin/schliesszeiten` — pool-based closures.
- `delivery/adminActions.ts` + `admin/lieferzeiten`, `admin/lieferzonen` —
  pool-based zones/windows.
- `payments/runtime.ts` — always postgres quote store (pool is mandatory there).
- New `src/lib/db/audit.ts` — shared `insertAuditEvent(pool, event)`.

## Verification
- Integration test for `saveTable`/`saveCombination` (new SQL on the read-only
  postgres store extended to full `ReservationStore`).
- `npm run check` green; prod smoke: staff login + admin pages after deploy.