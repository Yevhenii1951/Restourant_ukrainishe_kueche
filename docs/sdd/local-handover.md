# Local-first handover

## Ready locally

- Public menu, CMS content, quote/order runtime and public reservation flows use
  PostgreSQL when Supabase variables are absent.
- `kalyna_dev` is the isolated development database. It has 21 migrations,
  9 seeds, 10 menu items and 4 restaurant tables.
- Map tiles are consent-gated. Security headers are sent by Next.js. The AI
  assistant is read-only and stores only short-lived local session history when
  `DATABASE_URL` is configured.

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

- `npm run check`: 188 unit and 92 integration tests pass.
- `npm run build` passes.
- `/de/speisekarte`, `/de/bestellen` and `/de/reservierung` render from the
  seeded local database without Supabase environment variables.
- PR #32 merged KLN-025 retention/cost limits into `main` at `1670d6a`.

## Deliberate boundaries

- Staff authentication and mutable admin forms remain Supabase-auth dependent.
- Supabase setup, staff invite-email acceptance and mutable admin forms remain
  outside this local public-demo completion pass.
- Manual production-preview axe and p75 Web Vitals evidence must be recorded
  before a real launch; the repository does not claim automated axe coverage.
- This remains a fictional portfolio demo; no live payment or legal launch is
  authorised by this repository.
