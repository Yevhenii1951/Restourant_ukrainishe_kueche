# Kalyna - Ukrainische Küche in Kassel

Kalyna ist eine fiktive Full-Stack-Restaurantplattform für eine ukrainische Küche in Kassel. Das Projekt ist eine Portfolio-Demo und kein realer Restaurantbetrieb.

Die Anwendung zeigt eine produktionsnahe Webplattform: öffentliche Restaurantseiten, lokalisierte Speisekarte, Warenkorb und Checkout-Logik, Reservierungen, Admin-Workflows für Personal, Gutscheine, Catering-Anfragen, transaktionale E-Mail-Verarbeitung, Stripe-Testzahlungen, zustimmungsbasierte Kartenintegration und einen lesenden KI-Assistenten.

## Wichtiger Demo-Hinweis

- Kalyna ist ein Demo-Restaurant. Kontaktdaten, Verfügbarkeiten, Rechtstexte und Zahlungen dürfen nicht als echter Geschäftsbetrieb dargestellt werden.
- Stripe ist nur für den Testmodus vorgesehen.
- Deutsch ist die kanonische Inhaltssprache. Englische und ukrainische Inhalte dürfen auf Deutsch zurückfallen.
- Der KI-Assistent ist nur lesend und darf keine rechtlichen, medizinischen, ernährungsbezogenen oder allergenbezogenen Garantien geben.

## Hauptfunktionen

- Öffentlich lokalisierte Website mit `/de`, `/en` und `/uk`.
- Seiten für Start, Speisekarte, Mittagstisch, Bestellung, Warenkorb, Reservierung, Catering, Gutscheine, Galerie, Events, FAQ, Kontakt, Anfahrt, Impressum, Datenschutz und AGB.
- Speisekarten-Katalog mit Kategorien, Gerichten, Modifiern, Allergenen, Zusatzstoffen, Ernährungsmerkmalen und Verfügbarkeitsstatus.
- Browser-Warenkorb ohne personenbezogene Daten, danach serverseitige Angebots- und Checkout-Validierung.
- Abholung und Lieferung mit Lieferzonen, Servicefenstern, Bestell-Snapshots, öffentlichen Status-Tokens und Personal-Statuswechseln.
- Stripe Checkout und signaturgeprüfte Webhooks für Online-Zahlungen.
- Vollständige Rückerstattungen für abgeschlossene Online-Zahlungen.
- Reservierungsanfragen mit Verfügbarkeitsprüfung, Tischzuweisung, Haltefristen, öffentlichen Storno-Tokens und Personalbearbeitung.
- Personal- und Adminbereich mit rollenbasierter Zugriffskontrolle: `ADMIN`, `MANAGER`, `STAFF`.
- Typisiertes CMS-ähnliches Content-Management für öffentliche Seiten und Rechtsentwürfe.
- Gutscheinprodukte, Gutscheinkäufe und transaktionale Einlösung.
- Catering-Anfrageformular mit Workflow-Status und Personalbenachrichtigung.
- E-Mail-Outbox mit retry-orientierter Hintergrundverarbeitung.
- Leaflet-Karte, die erst nach Zustimmung/Konfiguration geladen wird.
- Lesende KI-Assistenten-Tools für Speisekarte, Öffnungszeiten, Liefergebühr, Reservierungsverfügbarkeit und FAQ-Daten.
- Audit-Trail für sensible Admin-Aktionen.

## Tech Stack

| Bereich | Technologie |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI Runtime | React 19 |
| Sprache | TypeScript 5 mit strikten Projektregeln |
| Styling | Tailwind CSS 4, CSS Design Tokens |
| Lokalisierung | `next-intl` mit deutschen, englischen und ukrainischen Routen |
| Datenbank | PostgreSQL über SQL-Migrationen |
| Backend-Plattform | Supabase Auth/PostgreSQL-Adapter, wenn konfiguriert |
| Zahlungen | Stripe Checkout und signierte Webhooks |
| E-Mail | Brevo-Adapter hinter einem Notification-Service |
| Karten | Leaflet, nur nach Karten-Zustimmung/Konfiguration |
| Validierung | Zod an externen Grenzen |
| Tests | Vitest Unit-/Integrationstests, Playwright für E2E-Szenarien |
| Deployment-Ziel | Vercel + Supabase EU |

Die lokale öffentliche Demo kann ohne Supabase laufen. Personal-Login und verändernde Admin-Formulare benötigen eine Supabase-Auth-Konfiguration.

## Projektstruktur

```text
src/
  app/                         Next.js-Routen, Layouts und Route Handler
    [locale]/(public)/          lokalisierte öffentliche Website-Seiten
    [locale]/(admin)/admin/     Personal-/Admin-Dashboard-Seiten
    [locale]/(auth)/admin/      Admin-Login und Passwortseiten
    api/                        AI-, Cron- und Stripe-Webhook-Routen
  features/                     featurebasierte Anwendungsmodule
    ai/                         Assistenten-Historie, Tools und Launcher
    admin/                      operative Einstellungen und Schließzeiten
    cart/                       lokaler Warenkorb-Domaincode und UI
    catering/                   Catering-Anfragen und Personalsteuerung
    contact/                    Öffnungszeiten und Kontaktkomponenten
    content/                    typisierte Inhalte, Public Chrome und Editor-UI
    delivery/                   Lieferfenster und Lieferzonen
    guest/                      Gastsuche für eigene Anfragen
    identity/                   Personal-Auth, Rollen und Sessions
    menu/                       Katalog-Domain, Stores und Menü-UI
    notifications/              E-Mail-/Outbox-Services
    order/                      Bestelldomain, Checkout und Personalaktionen
    payments/                   Stripe Checkout, Webhooks und Rückerstattungen
    quote/                      serverseitige Angebotsberechnung
    reservation/                Slots, Verfügbarkeit, Tische und Workflows
    seo/                        Metadata-, Sitemap- und JSON-LD-Helfer
    vouchers/                   Gutschein-Domain und Kaufformular
  i18n/                         Routing, Navigation und Message Loading
  lib/                          gemeinsame DB-, Env-, Logger- und Supabase-Utilities
  messages/                     de/en/uk Übersetzungsdateien

db/
  migrations/                   geordnete SQL-Migrationen
  seeds/                        deterministische Demo-/Testdaten

docs/sdd/                       Software-Design-Dokumentation und Tickets
public/                         Bilder, Logo und Hero-Video-Assets
tests/
  unit/                         schnelle Domain-/Helper-Tests
  integration/                  PostgreSQL-gestützte Integrationstests
scripts/                        Datenbank- und Admin-Bootstrap-Skripte
```

## Voraussetzungen

- Node.js `>=22.0.0`
- npm mit committeter `package-lock.json`
- PostgreSQL für lokale datenbankgestützte Entwicklung und Integrationstests
- Optionale Provider-Accounts für Supabase, Stripe, Brevo und KI-Funktionen

## Schnellstart

```sh
npm install
cp .env.example .env.local
npm run dev
```

Die lokale Next.js-URL wird vom Dev-Server ausgegeben, normalerweise `http://localhost:3000`.

Für die datenbankgestützte Demo eine lokale Entwicklungsdatenbank anlegen und Migrationen/Seeds ausführen:

```sh
createdb kalyna_dev
npm run db:local:migrate
npm run db:local:seed
```

## Umgebungsvariablen

`.env.example` enthält nur Variablennamen und keine echten Werte. Server-Secrets werden über `src/lib/env/server.ts` gelesen und mit `server-only` geschützt. Browser-Code erhält nur `NEXT_PUBLIC_*`-Werte über das Client-Env-Schema.

Minimale sinnvolle lokale `.env.local`:

```dotenv
DATABASE_URL=postgresql://<user>@localhost:5432/kalyna_dev
QUOTE_SIGNING_SECRET=<lokales-geheimnis-mit-mindestens-32-zeichen>
NEXT_PUBLIC_DEMO=true
```

PostgreSQL über Unix-Socket funktioniert ebenfalls:

```dotenv
DATABASE_URL=postgresql://<user>@/kalyna_dev?host=/var/run/postgresql
```

Häufige optionale Variablen:

| Variable | Zweck |
| --- | --- |
| `URL` | Basis-URL für Supabase-E-Mail-Links in Deployments |
| `SUPABASE_URL` | Server-seitige Supabase-Projekt-URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase Service Key |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-sichere Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-sicherer Supabase Anonymous Key |
| `STRIPE_SECRET_KEY` | Stripe Test Secret Key |
| `STRIPE_WEBHOOK_SECRET` | Secret zur Stripe-Webhook-Signaturprüfung |
| `BREVO_API_KEY` | Key für den transaktionalen E-Mail-Provider |
| `AI_PROVIDER_KEY` | Provider-Key für KI-Assistentenantworten |
| `GROQ_API_KEY` | Groq API-Key für den KI-Assistenten |
| `GROQ_MODEL` | Optionales Groq-Modell, Standard: `openai/gpt-oss-120b` |
| `AI_MONTHLY_BUDGET_EUR` | Monatliche Budgetgrenze für KI-Nutzung |
| `CRON_SECRET` | Secret für geschützte Cron-Endpunkte |
| `BOOTSTRAP_ADMIN_AUTH_USER_ID` | Supabase Auth User ID für Admin-Bootstrap |
| `BOOTSTRAP_ADMIN_DISPLAY_NAME` | Anzeigename für den gebootstrappten Admin |

## Datenbank

Das Projekt nutzt direkte SQL-Migrationen statt eines ORMs. Migrationen liegen in `db/migrations/`, Seed-Daten in `db/seeds/`.

Wichtige lokale Datenbankregeln:

- Entwicklungsskripte akzeptieren nur eine lokale Datenbank namens `kalyna_dev`.
- Testskripte akzeptieren nur eine lokale Datenbank namens `kalyna_test`.
- Sicherheitsprüfungen liegen in `src/lib/db/fuse.ts` und verhindern, dass Tests Entwicklungs-, Produktions- oder gehostete Supabase-Daten berühren.
- Supabase ist ein optionaler Runtime-Adapter für Deployment/Admin-Pfade; lokale Entwicklung kann direkt mit PostgreSQL arbeiten.

Lokale Entwicklungsdatenbank:

```sh
createdb kalyna_dev
npm run db:local:migrate
npm run db:local:seed
```

Lokale Testdatenbank:

```sh
createdb kalyna_test
```

`.env.test.local` anlegen:

```dotenv
APP_ENV=test
TEST_DATABASE_URL=postgresql://<user>@localhost:5432/kalyna_test
```

Testdatenbank über Unix-Socket:

```dotenv
APP_ENV=test
TEST_DATABASE_URL=postgresql://<user>@/kalyna_test?host=/var/run/postgresql
```

Danach Test-Schema und Seed vorbereiten:

```sh
npm run db:migrate
npm run db:seed
```

`npm run db:reset` entfernt Test-Schemas, aber nicht die Datenbank selbst.

## Skripte

| Befehl | Beschreibung |
| --- | --- |
| `npm run dev` | Lokalen Next.js Dev-Server starten |
| `npm run build` | Produktions-Build erstellen |
| `npm run start` | Produktionsserver nach dem Build starten |
| `npm run lint` | ESLint ausführen |
| `npm run typecheck` | `tsc --noEmit` ausführen |
| `npm run test:unit` | Unit-Tests ausführen |
| `npm run test:integration` | Integrationstests ohne Datei-Parallelisierung ausführen |
| `npm run test` | Unit- und Integrationstests ausführen |
| `npm run check` | Linting, Typecheck und alle Tests ausführen |
| `npm run test:e2e` | Playwright-Tests ausführen |
| `npm run db:reset` | Test-Schemas entfernen |
| `npm run db:migrate` | Testmigrationen und Rollen-Bootstrap anwenden |
| `npm run db:seed` | Testdatenbank befüllen |
| `npm run db:local:migrate` | Lokale Entwicklungsmigrationen anwenden |
| `npm run db:local:seed` | Lokale Entwicklungsdatenbank befüllen |
| `npm run db:bootstrap-admin` | Personal-/Admin-Profil bootstrappen |

## Tests

Der Standard-Quality-Gate ist:

```sh
npm run check
```

Dieser Befehl führt Linting, TypeScript-Prüfung, Unit-Tests und Integrationstests nacheinander aus. Integrationstests benötigen die dedizierte lokale Datenbank `kalyna_test` und brechen sicher ab, wenn die Testumgebung unsicher ist.

Playwright-E2E-Tests laufen separat:

```sh
npm run test:e2e
```

Für eine finale Release-Prüfung sollten zusätzlich ausgeführt werden:

```sh
npm run build
npm audit --omit=dev
```

## Sicherheitsmodell

- Öffentliche Browser-Mutationen schreiben nicht direkt in private operative Tabellen.
- Server Actions und Route Handler validieren Eingaben mit Zod und rufen Domain-Services auf.
- Preise werden immer serverseitig in ganzen Euro-Cents neu berechnet.
- Öffentliche Bestell- und Reservierungsseiten verwenden undurchsichtige Tokens.
- Stripe-Webhooks werden signaturgeprüft und idempotent verarbeitet.
- Personalrechte werden über Rollenprüfungen und Datenbank-Policies abgesichert.
- Secrets, öffentliche Tokens, vollständige Adressen, E-Mails, Telefonnummern und KI-Prompts mit personenbezogenen Daten dürfen nicht geloggt werden.
- Öffentliche Token-Seiten sind für `noindex`/`no-store` vorgesehen.
- KI-Tools sind allowlisted und nur lesend.

## Lokalisierung

Unterstützte Sprachen:

- `de` Deutsch, kanonischer Inhalt
- `en` Englisch
- `uk` Ukrainisch

Routen sind mit Locale-Präfix versehen. Fehlende englische oder ukrainische Felder fallen feldweise auf Deutsch zurück. Geld, Datum und geschäftliche Zeitberechnungen werden mit der Restaurant-Zeitzone `Europe/Berlin` lokalisiert.

## Geschäftsregeln Kurzfassung

- Bestellungen können Abholung oder Lieferung sein.
- Lieferberechtigung nutzt exakt normalisierte deutsche Postleitzahlen.
- Checkout unterstützt Stripe-Karte, Stripe PayPal wenn aktiviert, Barzahlung bei Abholung und Barzahlung bei Lieferung.
- Jede neue Bestellung benötigt weiterhin die Annahme durch das Restaurant.
- Browser-Weiterleitungen markieren eine Bestellung nie als bezahlt; der Webhook ist maßgeblich.
- Gäste können Bestellungen nur stornieren, solange sie auf Restaurantannahme warten.
- Reservierungen sind zuerst Anfragen, keine automatischen Bestätigungen.
- Die Tischzuweisung muss überlappende Reservierungshalte verhindern.
- Vollständige Rückerstattungen sind im Scope; Teilrückerstattungen nicht.
- Kundenkonten sind außerhalb des Scopes; Gäste nutzen öffentliche Token-Links und die telefonbasierte Seite „Meine Anfragen“.

## Dokumentation

Der Implementierungsvertrag liegt in `docs/sdd/`.

Wichtige Einstiegspunkte:

- `docs/sdd/spec.md` - funktionale und nicht-funktionale Anforderungen
- `docs/sdd/architecture.md` - Systemgrenzen und Modulverantwortung
- `docs/sdd/database-schema.md` - Datenbankvertrag
- `docs/sdd/api-contracts.md` - Server-Action- und Routenverträge
- `docs/sdd/security.md` - Threat Model und Sicherheitskontrollen
- `docs/sdd/testing-strategy.md` - Testmatrix und Quality Gates
- `docs/sdd/state.md` - aktuelles Implementierungs-Handover
- `docs/sdd/tickets/` - Implementierungstickets

## Entwicklungsregeln

- Server Components bevorzugen; Client Components nur für Browser-APIs und Interaktion verwenden.
- Code featurebasiert unter `src/features/` colocaten.
- Keine Barrel Exports verwenden.
- Kein `any` verwenden.
- Dateien unter 200 Zeilen und Komponenten unter 150 Zeilen halten.
- Exportierte Funktionen sollen explizite Rückgabetypen haben.
- Jede externe Grenze mit Zod validieren.
- Zeitstempel als `timestamptz` speichern; `Europe/Berlin` für Geschäftslogik verwenden.
- Datenbanktransaktionen für Bestellerstellung, Reservierungszuweisung und Rückerstattungen nutzen.
- Service Keys nur serverseitig verwenden.
- `prefers-reduced-motion` respektieren.
- CSS-Variablen/Design Tokens statt beliebiger Markenfarben in JSX nutzen.

## Deployment-Hinweise

Das vorgesehene Deployment-Ziel ist Vercel mit Supabase-EU-Projekten. Entwicklung, Test und Produktion sollten getrennte Umgebungen verwenden. Preview und Produktion sollten im Stripe-Testmodus bleiben, bis ein realer Betreiber, echte rechtliche Daten und Live-Zahlungsfreigabe existieren.

Vor dem Deployment müssen Supabase Auth Redirects so konfiguriert werden, dass Invite-, Magic-Login- und Passwort-Reset-Links nach `/auth/callback` zurückkehren.
