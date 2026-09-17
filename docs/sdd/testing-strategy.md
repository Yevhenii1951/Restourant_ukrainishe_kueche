# Testing Strategy

## Definition of Done Per Ticket

1. Read requirement and ticket.
2. For computable behaviour, add the failing verification test in a test-only pass.
3. Run it and capture the expected red reason.
4. Implement the smallest compliant slice in a separate pass.
5. Run targeted test, then `npm run check` sequentially.
6. Run the ticket browser scenario when specified.
7. Review against code standards and requirement IDs.
8. Commit and push the feature branch; human opens/merges PR.

Never weaken a valid test to make implementation green.

## Commands Contract

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration --no-file-parallelism",
    "test": "npm run test:unit && npm run test:integration",
    "check": "npm run lint && npm run typecheck && npm run test",
    "test:e2e": "playwright test",
    "build": "next build"
  }
}
```

Final stage additionally runs E2E and build. Database suites are never parallelized.

## Environment Fuse

Before database tests:

- require `APP_ENV=test` and an explicit test project marker;
- reject known development/production Supabase refs/URLs;
- reject an absent database URL rather than falling back;
- reset only the dedicated test schema/project;
- seed deterministic UTC data and set business-zone cases explicitly.

CI secrets use a disposable/local test database. Preview/production are never test targets.

## Test Matrix

| Domain | Unit | Integration/database | Browser |
| --- | --- | --- | --- |
| Pricing | quantities, modifiers, promo boundaries, min/free delivery, vouchers, rounding | forged price ignored, transaction snapshot | cart -> final total |
| Orders | transition allow/deny, cancellation policy | idempotency, optimistic version, foreign token | pickup and delivery journeys |
| Payments | event mapping | invalid signature, replay, amount/currency mismatch, refund retry | Stripe test redirect/return plus webhook fixture |
| Reservations | duration/cutoff/slot rules, smallest-fit allocation | overlap race, expired hold, confirmation recheck | request and token cancellation |
| Auth/RBAC | permission matrix | every role allowed/denied, inactive/last admin | staff vs manager navigation/actions |
| Menu/CMS | fallback, publish readiness | RLS, archive/reference constraints | edit -> public render |
| AI | scope, PII warning/redaction, tool schema | fake provider/tools, rate/budget/retention | streaming/failure/fallback |
| Email/outbox | template locale | retry/idempotency/dead letter | admin delivery status only |
| SEO/a11y | metadata helpers | generated route metadata | axe + manual critical flow |

## Boundary Cases That Must Exist

- Quantity 0, 1, configured maximum and maximum + 1.
- Promo exactly at start/end, one use before/at/after limit.
- Subtotal one cent below, equal to and above delivery minimum/free threshold.
- Voucher balance below/equal/above order total and two concurrent redemptions.
- Slot at opening, last valid start, crossing close, closure and DST transitions.
- Reservation party capacity -1/equal/+1 and cancel cutoff before/equal/after.
- Role allow/deny for each sensitive capability.
- Public token valid, malformed, expired/revoked and another record's token.
- AI message 0/1/2000/2001 characters and retention just before/at five days.

## External Services

- Unit/integration suites use typed fake adapters, never real paid APIs.
- Stripe webhook fixtures are signed in test code with a test secret.
- One optional sandbox smoke suite may run manually against Stripe/Brevo/AI.
- Contract tests verify adapter mapping without asserting provider implementation internals.

## CI

- Trigger on pull request and push to protected branches.
- Install from lockfile, run check, migration/RLS tests, build, then Playwright where provisioned.
- Upload sanitized Playwright trace only on failure; traces must not contain real PII/secrets.
- Branch protection and PR creation remain a human GitHub configuration step.

