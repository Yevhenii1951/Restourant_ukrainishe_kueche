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

## Lokale Testdatenbank

Die Integrationstests laufen gegen eine lokale PostgreSQL-Datenbank und brechen
sofort ab, wenn `APP_ENV` nicht `test` ist oder die `TEST_DATABASE_URL` eine
Entwicklungs-/Produktions- oder gehostete Supabase-Datenbank referenziert
(kein Fallback, siehe `src/lib/db/fuse.ts`). Zulässig sind nur lokale Hosts und
der Datenbankname `kalyna_test`.

1. Lokales PostgreSQL starten und Datenbank anlegen:

   ```sh
   createdb kalyna_test
   ```

2. `.env.test.local` anlegen (wird nicht committet):

   ```dotenv
   APP_ENV=test
   TEST_DATABASE_URL=postgresql://<user>@localhost:5432/kalyna_test
   ```

   Für eine Unix-Socket-Verbindung (kein Passwort):

   ```dotenv
   TEST_DATABASE_URL=postgresql://<user>@/kalyna_test?host=/var/run/postgresql
   ```

3. Schema und Seed einmalig anlegen:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

`npm run db:reset` entfernt die Test-Schemas (nicht die Datenbank). CI startet
eine postgres-Service-Container mit derselben `kalyna_test`-Datenbank.

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
| `npm run db:reset` | Test-Schemas entfernen |
| `npm run db:migrate` | Migrationen anwenden (+ Rollen-Bootstrap) |
| `npm run db:seed` | Seed-Daten einspielen |