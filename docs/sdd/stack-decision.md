# Stack Decision

## Selected Stack

```text
Next.js 16 App Router + React 19.2 + TypeScript strict
Tailwind CSS 4 + Radix/shadcn primitives
Supabase EU: PostgreSQL, Auth, Storage
Supabase client + SQL migrations (no Prisma)
Zod + React Hook Form
next-intl with /de, /en and /uk routes
Stripe Checkout + verified webhooks
Brevo transactional email behind an EmailService interface
Vercel AI SDK + provider adapter; structured tools, no vector database
Leaflet + consent-gated external tiles
Plausible Analytics, loaded only after configuration/privacy review
Vitest + Testing Library + Playwright + axe-core
Vercel + separate Supabase development, test and production projects
```

## Rationale

- Next.js is justified because this is an application with checkout, admin,
  payments and server-side workflows, not only a restaurant brochure.
- Direct Supabase access avoids two schema systems. SQL migrations express
  constraints, transactions, grants and RLS more accurately than an ORM here.
- Stripe Checkout minimizes PCI scope. The webhook, not the return page, is the
  source of payment truth.
- Structured AI tools query current restaurant data and remain auditable. Menu
  scale does not justify embeddings or pgvector.
- Provider interfaces isolate email, analytics and AI without inventing a
  generic repository framework.

## Alternatives Rejected

- Astro: excellent for the marketing pages, but adds a second application or
  awkward server architecture for this scope.
- Prisma: convenient types, but duplicates Supabase migration/auth patterns and
  does not replace RLS or database functions.
- Custom payment UI: more state and compliance risk than Checkout.
- Generic headless CMS: unnecessary for typed restaurant forms.
- OpenStreetMap called "DSGVO-safe": false as a blanket claim; tile requests can
  expose IP addresses and therefore require an explicit privacy decision.
- Reusing Oma Netz credentials: prohibited. Only its streaming UX concept may
  inform implementation.

## Version Policy

Use exact versions resolved at project initialization and commit the lockfile.
Do not silently upgrade major versions inside feature tickets. Record major
upgrades in `adr.md` and run the entire suite.

## Environments

| Environment | Vercel | Supabase | Stripe | Email | AI |
| --- | --- | --- | --- | --- | --- |
| Local dev | local | development | test | sandbox | low-cost key |
| Automated test | CI/local | dedicated test | mocks/test | fake adapter | fake adapter |
| Preview | preview | development | test | sandbox | capped key |
| Production demo | production | production | test mode | sandbox/demo | capped key |

Live Stripe mode is a separate future decision requiring real business and legal data.

