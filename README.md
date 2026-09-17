# Kalyna — Ukrainische Küche in Kassel

Portfolio-Demo einer Restaurant-Plattform. Kein realer Restaurantbetrieb.

## Voraussetzungen

- Node.js >= 22
- npm (lockfile ist committet)

## Einrichtung

1. `npm install`
2. `cp .env.example .env.local` und Werte eintragen (siehe Abschnitt Umgebung)
3. `npm run check` — lint, typecheck, unit-/integrationstests
4. `npm run dev` — lokale Entwicklung

## Umgebung

`.env.example` enthält ausschließlich Variablennamen ohne Werte. Server-Secrets
(`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, …) sind nur im Server-Kontext
verfügbar (`src/lib/env/server.ts`, Guard via `server-only`). Der Client erhält
nur `NEXT_PUBLIC_*`-Werte über `src/lib/env/schemas.ts`.

## Skripte

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Dev-Server |
| `npm run build` | Produktions-Build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Unit-Tests |
| `npm run test:integration` | Integrationstests (kein Parallelismus) |
| `npm run check` | lint + typecheck + alle Tests |