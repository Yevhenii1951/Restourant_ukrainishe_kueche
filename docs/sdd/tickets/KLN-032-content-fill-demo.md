# KLN-032 – Content fill (demo-first visitor layer)

**Branch:** `feature/kln-032-content-fill-demo` · **PR:** #49 · **Merged:** 2026-09-24 (`7854405`)

## Goal
Fill the deployed + local visitor site with content and photos so **every card has an image**.
Remote DB/Storage is unreachable (PGRST108/42501 embed issue on remote schema; API token `forbidden`) → serve the **demo source** when `NEXT_PUBLIC_DEMO === "true"` (already set in Vercel, default in schema).

## Changes
- `src/features/menu/demoMenu.ts` — rewritten to **mirror the published seed catalog** (same ids, prices, categories, sort order). Result: cart/checkout read the same id→price data as the seeds (QuoteStore contains no `listPublicMenu`), so nothing breaks. **All 9 dishes now ship an image**; `banusch` (no photo) excluded.
- `src/features/content/demoContent.ts` — gallery with ~all photos in `public/` (borsch 1/2 via URL-encoded `/borsch%201.jpg`, deruni2, golubtsi2, kotleta1/2, kotleta_po_Kievski2, pampushki1–3, uzvar2, kutja); richer de/en/uk copy for home/about/faq/lunch/events/catering. 8 demo entries ≥ the 7 required by `withDemoContentFallback([])`.
- `src/lib/env/demoMode.ts` — `isDemoContentMode()` (server-only), used as short-circuit gate in `getPublicMenu`/`getPublicContentEntries`.
- `.env.test.local` — `NEXT_PUBLIC_DEMO=false` keeps the 199 unit + 93 integration runs on the DB path.
- `tests/unit/launch002-demo-fallback.test.ts` — updated to the 9-item demo menu.

## Verification
- `npm run check` green (lint, tsc, 199 unit, 93 integration).
- Post-deploy smoke (see state.md): speisekarte all cards with photos; galerie ~full; catering/mittagstisch populated.