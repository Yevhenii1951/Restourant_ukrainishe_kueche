# SDD Session State (local-first completion)

## Done
- KLN-025 AI retention implemented on `feature/kln-025-ai-retention-limits`.
- Added local PostgreSQL `ai_conversations` and `ai_messages` retention tables with RLS/grants, opaque session hash, locale, five-day expiry and message token counts.
- `/api/ai/chat` now issues an HttpOnly opaque session cookie, caps input at 2,000 chars, rejects obvious PII, rate-limits by IP/session and stores successful local exchanges when `DATABASE_URL` is available.
- Missing `AI_MONTHLY_BUDGET_EUR` fails closed for configured paid AI provider calls; no EUR amount is invented.
- Added `/api/cron/ai-retention` cleanup guarded by `CRON_SECRET` and documented `AI_MONTHLY_BUDGET_EUR` in `.env.example`.

## Verification
- `npm run db:local:migrate` applied `0021_ai_retention.sql` to `kalyna_dev`.
- `npx vitest run tests/unit/kln024-ai-tools.test.ts tests/unit/kln025-ai-retention.test.ts`: 8 tests passed.
- `npm run check`: lint, typecheck, 188 unit tests and 92 integration tests passed.
- `npm run build`: passed on Next.js 16.3.5; build still prints the existing metadataBase warning for social image resolution.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Next
- Finish KLN-026 through KLN-028 if continuing ticket-by-ticket: consent/security evidence, accessibility/performance audit evidence, final verification/handover ledger.
- Admin authentication and mutable admin forms deliberately remain Supabase-auth based; connect Supabase before using staff/admin operations.
