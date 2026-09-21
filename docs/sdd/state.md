# SDD Session State (local-first completion)

## Done
- KLN-022 admin operations implemented on `feature/kln-022-admin-settings-audit`.
- Manager customer CSV boundary uses spreadsheet-formula guarding and writes an audit summary; STAFF receives neither export nor audit data.
- Added admin-only redacted audit viewer, Europe/Berlin daily aggregates excluding cancelled/rejected orders, and typed closure management.
- Existing typed delivery, table, reservation and availability settings are linked from the admin overview.
- Public menu and typed CMS content now read from local PostgreSQL when Supabase is not configured.
- Quotes, order creation and Stripe checkout use a PostgreSQL quote store in local-first mode.
- Reservation availability and public reservation requests now use a PostgreSQL read store in local-first mode.
- Added CSP, no-sniff, referrer and permissions headers; local HTTP verification confirms they are emitted.
- Added guarded `db:local:migrate` and `db:local:seed` commands for `localhost/kalyna_dev`; Supabase remains optional.
- Added a fail-closed AI launcher and a bounded read-only public-menu answer; allergy questions refuse safety guarantees and unknown prompts fail closed.

## Verification
- `npm run check` was green before the local-first changes: 180 unit and 92 integration tests.
- After the local-first changes, `npm run check` is green (180 unit, 92 integration) and `npm run build` completes successfully.
- Browser checks on `.env.local` / `kalyna_dev`: `/de/speisekarte` renders 10 seeded dishes, `/de/bestellen` renders the seeded menu, and `/de/reservierung` reads the seeded table inventory without Supabase variables.
- `kalyna_dev` has all 20 migrations and 9 seeds; a second `db:local:migrate`/`db:local:seed` run reports all current.

## Next
- Admin authentication and mutable admin forms deliberately remain Supabase-auth based; connect Supabase before using staff/admin operations.
- KLN-025 through KLN-028 remain planned SDD scope (AI retention, consent expansion, final accessibility and handover).
