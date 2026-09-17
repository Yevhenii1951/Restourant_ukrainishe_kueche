# Architecture Specification

## System Boundary

```text
Browser
  -> Next.js public/admin routes
  -> Server Actions for first-party form mutations
  -> Route Handlers for Stripe webhooks, AI streaming and public token actions
  -> domain services (pure rules + orchestration)
  -> repositories/database functions
  -> Supabase PostgreSQL/Auth/Storage

External: Stripe, Brevo, AI provider, map tiles, Plausible
```

The browser never writes directly to private operational tables. Public menu reads
may use a restricted view. All checkout, reservation and admin mutations pass
through the server, Zod validation, authorization and domain services.

## Module Boundaries

| Module | Owns | Must not own |
| --- | --- | --- |
| `catalog` | categories, dishes, modifiers, allergens | cart/order state |
| `cart` | browser cart representation, revalidation input | authoritative prices |
| `ordering` | quote, order snapshots, transitions, public access | payment truth |
| `payments` | checkout sessions, webhooks, refunds | restaurant acceptance |
| `delivery` | PLZ zones, fees, service windows | customer address persistence policy |
| `reservations` | tables, allocation, holds, transitions | catering contracts |
| `content` | typed localized pages and media | operational settings |
| `identity` | staff profiles, roles, invitations | customer accounts |
| `notifications` | templates, outbox, retries | domain transactions |
| `assistant` | read-only tools, messages, retention | domain mutations |
| `audit` | append-only sensitive action events | analytics tracking |

Cross-module calls go through exported service functions, not table-shaped generic repositories.

## Proposed Structure

```text
src/
  app/
    [locale]/(public)/...
    [locale]/(commerce)/bestellen|warenkorb|kasse/...
    admin/(auth)|(...dashboard)/...
    api/stripe/webhook/route.ts
    api/ai/chat/route.ts
    api/public/orders/[token]/route.ts
    api/public/reservations/[token]/cancel/route.ts
  features/
    catalog/{components,queries,schemas}/
    cart/{components,store,schemas}/
    ordering/{actions,domain,repositories,components}/
    payments/{domain,adapters}/
    reservations/{actions,domain,repositories,components}/
    admin/{components,guards}/
    content/{queries,schemas,components}/
    assistant/{tools,domain,components}/
    notifications/{domain,adapters,templates}/
  lib/
    supabase/{browser,server,admin}.ts
    env/server.ts
    env/client.ts
    rate-limit.ts
    logger.ts
    money.ts
    time.ts
  i18n/
  messages/{de,en,uk}.json
supabase/
  migrations/
  seed.sql
tests/
  unit/
  integration/
  e2e/
  context.md
  risks.md
```

Keep each file under 200 lines. Split migration files by capability rather than
putting the entire schema into one migration.

## Data Flows

### Checkout

```text
cart IDs/modifiers -> quote action -> DB catalog/settings -> signed quote response
checkout input + quote ID -> transaction revalidation -> order snapshot
online: Stripe Checkout -> webhook -> payment state -> pending confirmation
cash: pending confirmation directly
staff accept -> outbox email -> public status token view
```

Quote expiration is 10 minutes. Order creation always recalculates; the quote is UX,
not authority. A duplicate idempotency key returns the original order.

### Reservation

```text
date/party -> availability query -> candidate slots
request -> transaction locks candidate table rows -> pending hold + token
staff confirms -> transaction rechecks allocation -> confirmation + outbox
cleanup job -> expires stale pending holds
```

### AI

```text
message -> validation/rate/budget -> redact obvious PII -> provider stream
provider tool request -> allowlisted read service -> sanitized tool result
messages -> short-lived conversation store -> daily deletion after five days
```

## Background Work

- Use an `outbox_events` table written inside domain transactions.
- A protected Vercel Cron route claims events with `FOR UPDATE SKIP LOCKED`.
- Retry email with bounded exponential backoff; dead-letter after configured attempts.
- Cron also expires reservation holds and purges AI conversations.
- Every job is idempotent and authenticated with a server-only cron secret.

## Rendering and Caching

- Marketing/content routes use server rendering with tagged revalidation.
- Menu public view may be cached briefly and invalidated after admin changes.
- Cart, checkout, public status, admin and availability are dynamic/no-store.
- Never cache responses containing PII or public access tokens.

## Failure Policy

- Database unavailable: block mutations and show retry path.
- Stripe unavailable: keep cart; do not create falsely paid order.
- Email unavailable: preserve successful transaction, queue retry.
- AI/analytics/map unavailable: core ordering and contact information remain usable.
- Translation absent: German fallback.

