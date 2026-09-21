# Local-first handover

## Ready locally

- Public menu, CMS content, quote/order runtime and public reservation flows use
  PostgreSQL when Supabase variables are absent.
- `kalyna_dev` is the isolated development database. It has 20 migrations,
  9 seeds, 10 menu items and 4 restaurant tables.
- Map tiles are consent-gated. Security headers are sent by Next.js.

## Start

```sh
createdb kalyna_dev
cp .env.example .env.local
# Set DATABASE_URL and QUOTE_SIGNING_SECRET in .env.local.
npm run db:local:migrate
npm run db:local:seed
npm run dev
```

The local scripts accept only `kalyna_dev` on localhost or the documented
`/var/run/postgresql` Unix socket. They are idempotent.

## Verified

- `npm run check`: 180 unit and 92 integration tests pass.
- `npm run build` passes.
- `/de/speisekarte`, `/de/bestellen` and `/de/reservierung` render from the
  seeded local database without Supabase environment variables.

## Deliberate boundaries

- Staff authentication and mutable admin forms remain Supabase-auth dependent.
- Tickets KLN-023 to KLN-028 (AI assistant, retention, accessibility and final
  launch handover) are not implemented by the local public-demo work.
- This remains a fictional portfolio demo; no live payment or legal launch is
  authorised by this repository.
