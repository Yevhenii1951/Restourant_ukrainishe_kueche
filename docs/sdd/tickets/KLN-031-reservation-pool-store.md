# KLN-031 — Production reservation availability/store path

## Intent

Fix the 500 on `/de/reservierung` in the deployed Vercel app. Guests could
open the page but "Verfügbarkeit anzeigen" and the request form both fail
with PostgREST `PGRST108: 'reservations' is not an embedded resource`.

## What It Delivers

In the deployed app the reservation availability and the reservation request
flow read through the Supabase REST store, which cross-table-embeds
`reservations` from `reservation_allocations`. On the remote tenant that
relationship is not resolvable for the app role (schema-cache/grant/FK state),
so every guest booking attempt returns 500. This ticket routes the public
reservation store through the same pg-pool path already used by the create
SQL (and by local dev / integration tests). The single-table SQL reads and the
`create_reservation_request()` function do not need the REST embed, so the
guest flow works in production.

## Blocked By

None.

## Verification Scenario

```text
GIVEN the production site restourant-ukrainishe-kueche.vercel.app
WHEN a guest opens /de/reservierung, picks a date/party and requests a slot
THEN the availability renders a slot list and submitting the form creates a
     reservation instead of returning HTTP 500 with PGRST108
```

## Context To Read

- `docs/sdd/tickets/KLN-014-reservation-request.md`
- `docs/sdd/tickets/KLN-013-reservation-availability.md`
- `docs/sdd/state.md` (latest session)

## Input / Output Matrix

| Input / State | Expected Output |
| --- | --- |
| `DATABASE_URL` configured (local + Vercel) | store = `createPostgresReservationStore(pool)` |
| no `DATABASE_URL` | `service-unavailable`, never a PostgREST embed error |

## Acceptance Criteria

- Guest availability on `/de/reservierung` works in production (no 500).
- Guest reservation request reaches the DB and creates a reservation.
- `npm run check` stays green.
- `createSupabaseReservationStore` remains for admin/staff paths.

## Non-Goals

- Order/quote/admin supabase stores (unchanged).
- Fixing the remote tenant's reservation FK/grant/schema-cache state.
- Reservation staff operations.

## Checks

- `npm run check` (lint + typecheck + 199 unit + 93 integration).
- Live smoke of the deployed `/de/reservierung` after merge.

## Browser Scenario

```text
Open https://restourant-ukrainishe-kueche.vercel.app/de/reservierung
-> see calendar + party selector render
-> pick a future date -> "Verfügbarkeit anzeigen" -> slots list, HTTP 200
-> submit a request -> success state, no 500
```