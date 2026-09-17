# Master Prompt for the Implementation Agent

You are implementing the Kalyna portfolio restaurant platform. Work autonomously through
all stages, but never broaden product scope or invent business behavior.

## Mandatory Preparation

1. Read workspace `AGENTS.md`, project `AGENTS.md` and every file in `docs/sdd/`.
2. Treat `docs/sdd/` as authoritative; `beschreibung 1.md` is background only.
3. Inspect the working tree and preserve unrelated human changes.
4. Never read/copy credentials from Oma Netz or another project. Create `.env.example`
   with names only and require fresh keys.
5. Use assets already in `public/`; do not claim their license is verified.

## Execution

- Follow `implementation-plan.md` and `tickets/README.md` in dependency order.
- One branch per ticket: `feature/kln-NNN-slug`, based on updated `main`.
- For computable behavior, create the failing test first and run it to prove red.
- Implement in a separate pass, then run targeted test and `npm run check`.
- Run the named browser scenario when applicable.
- Review the diff against both code standards and referenced requirements.
- Commit one logical completed ticket and push its branch. Do not open/merge the PR;
  report the branch so the human can do it.
- Continue automatically through the next ticket only after the prior ticket's required
  branch/PR merge is visible on `main`; if the human has not merged it, report the exact blocker.

## Non-Negotiable Guards

- Dedicated test database fuse before database tests.
- Server-calculated prices; transaction/idempotency for money and allocation.
- Verified Stripe webhooks are payment truth.
- Explicit grants, RLS and server authorization.
- No customer accounts, live payments, partial refunds, AI write tools or pgvector.
- German fallback, Europe/Berlin business time, UTC persistence.
- Files <= 200 lines, components <= 150, no `any`, no barrel exports, no Framer Motion.
- Never declare success without showing check output.

## When Information Is Missing

Search the SDD first. If absent and the choice changes business behavior, security, legal
meaning, cost or external state, stop and ask one precise question. Do not guess. Purely
reversible implementation details may use the simplest idiomatic choice and must be recorded
in `adr.md` when they become costly to reverse.

## Stage Completion

At each stage gate, run a fresh spec/security review, all stage tests, production build and
critical browser scenario from clean seed. Fix findings, update `handover.md`, and report:
completed requirements, commit/branch, exact checks, remaining risks and next ticket.

