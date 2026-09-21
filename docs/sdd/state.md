# SDD Session State (local-first completion)

## Done

- KLN-025 AI retention shipped via PR #32 and merged to `main` at `1670d6a`.
- Added local PostgreSQL `ai_conversations` and `ai_messages` retention tables with RLS/grants, opaque session hash, locale, five-day expiry and message token counts.
- `/api/ai/chat` now issues an HttpOnly opaque session cookie, caps input at 2,000 chars, rejects obvious PII, rate-limits by IP/session and stores successful local exchanges when `DATABASE_URL` is available.
- Missing `AI_MONTHLY_BUDGET_EUR` fails closed for configured paid AI provider calls; no EUR amount is invented.
- Added `/api/cron/ai-retention` cleanup guarded by `CRON_SECRET` and documented `AI_MONTHLY_BUDGET_EUR` in `.env.example`.
- KLN-026 consent/security and KLN-027 accessibility/performance boundaries are represented in the app and docs: consent-gated Leaflet, browser security headers, token page isolation, no video on public routes and an honest manual preview checklist.
- KLN-028 local handover evidence is current for the local PostgreSQL path. Supabase setup remains deliberately outside this local completion pass.

## Verification

- `npm run db:local:migrate` applied `0021_ai_retention.sql` to `kalyna_dev`.
- `npx vitest run tests/unit/kln024-ai-tools.test.ts tests/unit/kln025-ai-retention.test.ts`: 8 tests passed.
- `npm run check`: lint, typecheck, 188 unit tests and 92 integration tests passed.
- `npm run build`: passed on Next.js 16.3.5; build still prints the existing metadataBase warning for social image resolution.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Supabase Readiness

- `/[locale]/admin/login` now provides staff email/password login, magic link email and password reset email when Supabase env is configured.
- `/auth/callback` exchanges Supabase invite, magic and reset `code` values for HttpOnly session cookies.
- `/[locale]/admin/password` lets invited/reset staff set a password after callback, and admin navigation includes sign out.
- See `docs/sdd/supabase-admin-setup.md` for the exact env and redirect URL checklist.

## Launch Boundaries

- Staff login and mutable admin forms remain Supabase-auth based; connect Supabase before using staff/admin operations.
- No production deployment URL, live payment enablement, live legal approval or live Supabase invite-email browser journey is claimed here.
- Axe and p75 Web Vitals remain manual production-preview release checks; no automated axe runner is configured.
