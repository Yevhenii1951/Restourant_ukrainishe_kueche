# SDD Session State (local-first completion)

## Done

- KLN-029 design rebrand on `feature/kln-029-design-rebrand` (committed `f0e9c8e`, pushed — PR not yet open): public-chrome redesign on a vyshyvanka-inspired palette (brand red `#A6192E`, near-black `#141414`, cream `#F6F1E6`, gold `#E3A62C`) as CSS tokens in `src/app/globals.css`; Cormorant Garamond + Manrope fonts; home page = HomeHero (full-bleed background video `/videos/hero.mp4` compressed 2.5MB + webm, poster fallback, hidden under `prefers-reduced-motion`) + HomeSteps / HomeFeatured / HomeOffer / HomeServices / HomeCta; light paper SiteHeader with text wordmark `Kalyna` (KalynaLogo: Cormorant + vyshyvanka rhombus row, red on paper / cream on dark) + `icon.svg` favicon (red tile, cream К); SiteFooter wordmark on brand-deep; marquee/bege-лента strip REMOVED (MarqueeStrip, KalynaMark deleted, ticker keys dropped); LocaleSwitcher light variant, CartBadge/AssistantLauncher/MobileActionBar in new palette; `main` = `pt-8 sm:pt-12` with home wrapper `-mt-8 sm:-mt-12` keeping hero flush. `.gitignore` ignores `.env*`/`.vercel` but re-includes `.env.example`.
- KLN-025 AI retention shipped via PR #32 and merged to `main` at `1670d6a`.
- Added local PostgreSQL `ai_conversations` and `ai_messages` retention tables with RLS/grants, opaque session hash, locale, five-day expiry and message token counts.
- `/api/ai/chat` now issues an HttpOnly opaque session cookie, caps input at 2,000 chars, rejects obvious PII, rate-limits by IP/session and stores successful local exchanges when `DATABASE_URL` is available.
- Missing `AI_MONTHLY_BUDGET_EUR` fails closed for configured paid AI provider calls; no EUR amount is invented.
- Added `/api/cron/ai-retention` cleanup guarded by `CRON_SECRET` and documented `AI_MONTHLY_BUDGET_EUR` in `.env.example`.
- KLN-026 consent/security and KLN-027 accessibility/performance boundaries are represented in the app and docs: consent-gated Leaflet, browser security headers, token page isolation, no video on public routes and an honest manual preview checklist.
- KLN-028 local handover evidence is current for the local PostgreSQL path. Supabase setup remains deliberately outside this local completion pass.

## Verification

- KLN-030 in progress on `feature/kln-030-guest-anfragen` (stacked on `feature/kln-029-design-rebrand`): account-free «Meine Anfragen» overview — guest looks up own orders+reservations by phone (orders store no email). Spec NG-1 amended, ticket `docs/sdd/tickets/KLN-030-guest-anfragen.md` written. Unit `tests/unit/kln030-guest-domain.test.ts` (schema+merge), integration `tests/integration/kln030-guest-anfragen.test.ts` (phone-scoped store query) green; `npm run check` green (lint, typecheck, 199 unit, 93 integration). Page `/de/meine-anfragen` rendered + form submit returns the empty state (Playwright); footer link + sitemap added.

- KLN-029: `npm run check` green (lint, typecheck, 195 unit, 92 integration). Playwright: hero video `hero.mp4` autoplays muted/loop 1920×1080 and is `display:none` under `prefers-reduced-motion` (poster/base image shows); hero flush under header, menu h1 48px gap; no horizontal overflow at 390/1440; contrast red-on-cream 6.66 / cream-on-red 6.66 / ink-on-cream 16.36 / gold-on-black 8.56; favicon `/icon.png` + title present. Marquee gone. Dev on `:3001` (existing server, log `/tmp/kalyna-dev.log`). The single console "error" is a dev-only React `eval()` CSP notice, not a bug.
- KLN-029 tweak: HomeServices cards («Veranstaltungen & catering») — photo now left inside card (flex-row, 45% width), stacked on top on mobile (verified in Playwright).
- `npm run db:local:migrate` applied `0021_ai_retention.sql` to `kalyna_dev`.
- `npx vitest run tests/unit/kln024-ai-tools.test.ts tests/unit/kln025-ai-retention.test.ts`: 8 tests passed.
- `npm run check`: lint, typecheck, 195 unit tests and 92 integration tests passed.
- `npm run build`: passed on Next.js 16.3.5; build still prints the existing metadataBase warning for social image resolution.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Supabase Readiness

- `/[locale]/admin/login` now provides staff email/password login, magic link email and password reset email when Supabase env is configured.
- `/auth/callback` exchanges Supabase invite, magic and reset `code` values for HttpOnly session cookies.
- `/[locale]/admin/password` lets invited/reset staff set a password after callback, and admin navigation includes sign out.
- Public homepage, menu and gallery now have built-in demo fallback cards and images when no local DB/Supabase content is available.
- See `docs/sdd/supabase-admin-setup.md` for the exact env and redirect URL checklist.

## Launch Boundaries

- Staff login and mutable admin forms remain Supabase-auth based; connect Supabase before using staff/admin operations.
- No production deployment URL, live payment enablement, live legal approval or live Supabase invite-email browser journey is claimed here.
- Axe and p75 Web Vitals remain manual production-preview release checks; no automated axe runner is configured.
