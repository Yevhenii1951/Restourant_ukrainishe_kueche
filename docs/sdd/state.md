# SDD Session State (local-first completion)

## Done

- **Prod smoke KLN-033 + KLN-034 passed** (2026-09-24, live `restourant-ukrainishe-kueche.vercel.app`): staff login via Supabase Auth (`test@kalyna.de`, staff row added to remote `staff_profiles`) then all 11 admin pages render from the remote DB through the pg-pool layer; read + write verified (tisch Fenster 2 deactivated/reactivated, original state restored). Smoke found and fixed two pool marshalling 500s → **KLN-034** (branch `feature/kln-034-pool-type-marshalling`, PR #51, merged `623d655`): (1) `pg` returns enum arrays `commercial_service_type[]` as a raw string → cast `affected_services::text[]` in closure SELECTs (`admin/postgresClosures.ts`, `quote/postgresQuoteStore.ts`, `reservation/postgresReservationStore.ts`); (2) pg returns `timestamptz` as `Date` while `CONTENT_ENTRY_SCHEMA` wants strings → normalize `updated_at`/`published_at` to ISO in `postgresContentStore.parseEntryRow`. Regression suite `tests/integration/kln034-pool-type-marshalling.test.ts` (2 tests). `npm run check` green: **203 unit, 99 integration**.
- KLN-035 (PR #52, `5443fd1`→merged): `/de/admin/inhalte` no longer uses the missing `admin.content` i18n namespace — German labels hardcoded like every other admin page (`Inhalte` / `Bearbeitbare Seiteninhalte – jede Publikation ist versionspflichtig.` / role-gated «Keine Berechtigung…»), rendered verified on prod.

- KLN-033 **pool-first staff/admin** (branch `feature/kln-033-pool-staff-admin`): every remaining Supabase/PostgREST data path moved to pg-pool-first SQL so staff login + admin forms work on the remote production DB (pool role `postgres.<ref>` bypasses RLS; remote schema lacks grants/embed → PGRST108/42501). Converted: staff store (`session.ts`/`staffActions.ts` → `createPostgresStaffStore(pool)`, pool-aware `withClient`; auth via Supabase Auth JWT unchanged), content admin (`contentActions`/`inhalte` incl. `[key]` editor → `createPostgresContentStore(pool)`), reservation staff (table/combination save now int `postgresReservationStore.ts` with `saveTable`/`saveCombination` incl. trigger-maintained capacity + transaction; `staffActions.ts` + tische/kombinationen pages pool-first), closures (`closureActions`/schliesszeiten → `postgresClosures.ts`), delivery admin (`adminActions`/lieferzonen/lieferzeiten → `postgresDelivery.ts`), quote store (`payments/runtime`, `order/runtime`, `quote/service` → pool-only), menu/content public services now pool-first. New shared `src/lib/db/audit.ts` `insertAuditEvent(pool, …)`. Integration test `tests/integration/kln033-pool-staff-admin.test.ts` (4 tests, incl. combination capacity + audit insert). Supabase fallback kept only where a sane `null` return exists (no `DATABASE_URL`).
- KLN-032 content fill merged (PR #49, `7854405`): visitor site now serves the **demo-first layer** (`NEXT_PUBLIC_DEMO=true` in Vercel, default in schema) since remote DB/Storage stays unreachable (PGRST108/42501 on remote schema; API token `forbidden`). `demoMenu` mirrors the published seed catalog (same ids/prices → cart/checkout unaffected), **all 9 menu cards now ship photos** (added vegetarischer-borschtsch `1borsch.jpg`, wareniki-kirschen `vareniki3.jpg`, syrnyky `vareniki2.jpg`; banusch excluded — no photo). `demoContent` rewrite: gallery ~all `public/` photos (borsch 1/2 via URL-encoded paths), richer home/about/faq/lunch/events/catering. Gate = `src/lib/env/demoMode.ts` `isDemoContentMode()`; `.env.test.local` sets `NEXT_PUBLIC_DEMO=false` so tests keep the DB path. Verified live: speisekarte 9 cards all with images, galerie 19 imgs, catering/mittagstisch populated.
- KLN-031 reservation fix merged (PR #42, `b4450cf`): reservation runtime moved to **pg-pool store** (pool role bypasses RLS; works on remote where PostgREST embed→PGRST108 fails). Prod smoke via Playwright: `/de/reservierung` shows available slots + submit returns token page — **reservation works in production**.
- Post-030 adaptivity pass (`overflow-x: clip`, catering honeypot zero-size, AI chat dialog above mobile bar).
- KLN-030 guest overview merged (PR #38, `1f0b8f4`); sibling design tasklets later landed directly on `main` on request.

- KLN-029 design rebrand on `feature/kln-029-design-rebrand` (committed `f0e9c8e`, pushed — PR not yet open): public-chrome redesign on a vyshyvanka-inspired palette (brand red `#A6192E`, near-black `#141414`, cream `#F6F1E6`, gold `#E3A62C`) as CSS tokens in `src/app/globals.css`; Cormorant Garamond + Manrope fonts; home page = HomeHero (full-bleed background video `/videos/hero.mp4` compressed 2.5MB + webm, poster fallback, hidden under `prefers-reduced-motion`) + HomeSteps / HomeFeatured / HomeOffer / HomeServices / HomeCta; light paper SiteHeader with text wordmark `Kalyna` (KalynaLogo: Cormorant + vyshyvanka rhombus row, red on paper / cream on dark) + `icon.svg` favicon (red tile, cream К); SiteFooter wordmark on brand-deep; marquee/bege-лента strip REMOVED (MarqueeStrip, KalynaMark deleted, ticker keys dropped); LocaleSwitcher light variant, CartBadge/AssistantLauncher/MobileActionBar in new palette; `main` = `pt-8 sm:pt-12` with home wrapper `-mt-8 sm:-mt-12` keeping hero flush. `.gitignore` ignores `.env*`/`.vercel` but re-includes `.env.example`.
- KLN-025 AI retention shipped via PR #32 and merged to `main` at `1670d6a`.
- Added local PostgreSQL `ai_conversations` and `ai_messages` retention tables with RLS/grants, opaque session hash, locale, five-day expiry and message token counts.
- `/api/ai/chat` now issues an HttpOnly opaque session cookie, caps input at 2,000 chars, rejects obvious PII, rate-limits by IP/session and stores successful local exchanges when `DATABASE_URL` is available.
- Missing `AI_MONTHLY_BUDGET_EUR` fails closed for configured paid AI provider calls; no EUR amount is invented.
- Added `/api/cron/ai-retention` cleanup guarded by `CRON_SECRET` and documented `AI_MONTHLY_BUDGET_EUR` in `.env.example`.
- KLN-026 consent/security and KLN-027 accessibility/performance boundaries are represented in the app and docs: consent-gated Leaflet, browser security headers, token page isolation, no video on public routes and an honest manual preview checklist.
- KLN-028 local handover evidence is current for the local PostgreSQL path. Supabase setup remains deliberately outside this local completion pass.

## Verification

- KLN-033: `npm run check` green before merge — lint, typecheck, **203 unit, 97 integration** (new kln033 suite 4/4: table write/read+update, combination create/reconfigure w/ capacity, pool staff read, audit insert).
- KLN-034: `npm run check` green before merge — lint, typecheck, **203 unit, 99 integration** (new kln034 suite 2/2: closure enum-array marshalling across admin/quote/reservation stores, content timestamps). After deploy: `/de/admin/schliesszeiten` + `/de/admin/inhalte` return 200 with data.
- KLN-035: `npm run check` green (203 unit / 99 integration); `/de/admin/inhalte` on prod renders the hardcoded German heading.
- KLN-032 live checks done (menu/gallery/catering/mittagstisch all populated, all cards with photos). `npm run check` green before merge (lint, tsc, 199 unit, 93 integration).
- Remaining: staff auth sign-in itself (Supabase Auth JWT) needs valid remote `auth.users` — prod admin/staff login must be browser-verified by a staff account after deploy.
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

- Staff login (`test@kalyna.de` remote auth account + remote `staff_profiles` row) browser-verified on 2026-09-24; the account is a smoke artifact and can be removed from `auth.users`/`staff_profiles` whenever desired.
- Mutable admin forms verified read/write through the pool layer on prod; live payment enablement, live legal approval and live Supabase invite-email journey remain out of scope for this portfolio demo.
- Axe and p75 Web Vitals remain manual production-preview release checks; no automated axe runner is configured.
