# KLN-034 – Pool type marshalling: closure arrays + content timestamps

**Branch:** `feature/kln-034-pool-type-marshalling`

## Problem

Prod smoke after KLN-033 (staff login + admin pages) found two 500s in the
pool-first layer that the local supabase-store path never exercised:

- `/de/admin/schliesszeiten` → `TypeError: a.affectedServices.join is not a
  function`. `pg` returns enum arrays (`commercial_service_type[]`) as a raw
  string `"{pickup,delivery}"`, not as a JS array. Affects `listClosures` and
  the reservation/quote closure reads.
- `/de/admin/inhalte` → `ZodError: Expected string, received date` at
  `updated_at`. `pg` returns `timestamptz` as `Date`, but
  `CONTENT_ENTRY_SCHEMA` expects strings.

## Change

- Cast `affected_services::text[]` in the three pool closure SELECTs
  (`admin/postgresClosures.ts`, `quote/postgresQuoteStore.ts`,
  `reservation/postgresReservationStore.ts`) so `pg` decodes a real array.
- Normalise `updated_at` / `published_at` from `Date` to ISO string in
  `postgresContentStore.parseEntryRow` before zod validation.

## Verification

- New integration test `kln034-pool-type-marshalling.test.ts`: `listClosures`
  returns `affectedServices` as `string[]` incl. a reservation-relevant
  service; `createPostgresContentStore(...).listEntries()` returns rows with
  string `updatedAt`.
- `npm run check` green; after merge, prod smoke: `/de/admin/schliesszeiten`
  and `/de/admin/inhalte` return 200 with data.