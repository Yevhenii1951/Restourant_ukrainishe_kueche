---
project: Kalyna - Ukrainische Küche in Kassel
type: portfolio full-stack restaurant platform
stack: Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, Stripe
deploy: Vercel + Supabase EU
---

# Project Rules

## Read First

Before changing code, read:

1. `docs/sdd/tier.md` (the locked ceremony tier)
2. the ticket being implemented
3. the domain document referenced by that ticket
4. `docs/sdd/state.md` (latest session handover)
5. workspace `AGENTS.md`

`spec.md` is authoritative but read once per project, not per ticket; re-read
only the relevant section when a ticket's acceptance criteria are ambiguous.
`beschreibung 1.md` is source material only. When they conflict, stop and
follow the SDD.

## Product Boundary

- This is a fictional portfolio restaurant, not a real trading business.
- Never present demo contact data, testimonials, availability, or payments as real.
- Never copy credentials from another project. Use fresh per-environment secrets.
- Do not provide legal, medical, or allergen guarantees through the AI assistant.
- German is the canonical content language. English and Ukrainian may fall back to German.

## Delivery Workflow

- Tier: **Standard** (see `docs/sdd/tier.md`). Ceremony stays at this tier.
- Work ticket by ticket in numeric order unless its `Blocked By` permits otherwise.
- One ticket = one branch = one PR: `feature/kln-<number>-<slug>`.
- Write the ticket's failing test first when behaviour computes; structural-only
  tickets need no test. Test and implementation may land in the same commit.
- Run `npm run check` before committing and show its output.
- Run the ticket's browser scenario where one is specified.
- Commit each completed ticket using Conventional Commits and push the branch.
- Open a PR with a description (`03_TEMPLATES/pr-template.md`) and merge it
  yourself once `npm run check` is green. Never commit directly to `main`
  and never merge red.
- Update `docs/sdd/state.md` at the end of every session.

## Quality Rules

- Server Components by default; client components only for interaction/browser APIs.
- Feature-based colocation. No barrel exports and no `any`.
- Files must stay under 200 lines; components under 150 lines.
- Exported functions have explicit return types.
- Validate every external boundary with Zod.
- Prices are integer euro cents and are always recalculated server-side.
- Persist all timestamps as `timestamptz`; business time zone is `Europe/Berlin`.
- Use database transactions for order creation, reservation allocation, and refunds.
- Every exposed Supabase table has explicit grants and RLS.
- Secret/service keys are server-only. Never log PII, secrets, tokens, or AI prompts with PII.
- Do not use Framer Motion. Respect `prefers-reduced-motion`.
- Use CSS variables as design tokens; no arbitrary brand colours in JSX.

## Required Checks

`npm run check` must run lint, typecheck, unit tests, and integration tests sequentially.
Playwright uses a separate command and a non-production test database.
Tests must fail immediately if their database URL matches development or production.

## Source and Asset Rules

- Assets in `public/` came from the previous Ukrainian Kitchen exercise.
- Verify ownership/licensing before production use and record it in `docs/sdd/asset-register.md`.
- Do not invent customer reviews or claim awards/certifications.
- Demo values must be controlled by seed data and labelled `Demo-Restaurant` in legal pages.

