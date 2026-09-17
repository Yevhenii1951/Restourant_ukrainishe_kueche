# Kalyna SDD Index

This directory is the implementation contract for the fictional portfolio project
**Kalyna - Ukrainische Küche in Kassel**. No application code should be written
until the relevant ticket and referenced contracts are read.

## Product Documents

| Document | Purpose |
| --- | --- |
| `intent.md` | Product intent, audience, boundaries |
| `spec.md` | Numbered functional and non-functional requirements |
| `business-rules.md` | Exact pricing, ordering, delivery, reservation rules |
| `state-machines.md` | Allowed order, payment, reservation, voucher transitions |
| `content-model.md` | Public pages, editable content, localization |
| `design-system.md` | Visual direction and UI rules |

## Engineering Documents

| Document | Purpose |
| --- | --- |
| `stack-decision.md` | Selected stack and rejected alternatives |
| `architecture.md` | Boundaries, modules, data flows, folder structure |
| `database-schema.md` | Tables, constraints, indexes and RLS intent |
| `api-contracts.md` | Server Actions, route handlers, input/output contracts |
| `authorization-matrix.md` | Guest/staff permissions |
| `security.md` | Threat model and security acceptance criteria |
| `testing-strategy.md` | Red-Green workflow and test matrix |
| `legal-compliance.md` | German compliance implementation checklist |
| `accessibility.md` | WCAG 2.2 AA and checkout requirements |
| `seo.md` | Local SEO, metadata and structured data |

## Execution Documents

| Document | Purpose |
| --- | --- |
| `implementation-plan.md` | Ordered stages and quality gates |
| `tickets/README.md` | Thin vertical tickets and execution order |
| `browser-scenarios/critical-flows.md` | Human-visible acceptance journeys |
| `adr.md` | Irreversible decisions |
| `open-questions.md` | Values that must not be invented |
| `handover.md` | Promised versus shipped; filled during implementation |
| `master-implementation-prompt.md` | Prompt for the implementation agent |

## Requirement Traceability

Every ticket names the requirements it implements. Tests use the requirement ID
in their description. Commits use:

```text
feat(order): create server-priced draft (implements FR-ORD-4)
```

## Release Tracks

1. **Core:** marketing, menu, guest cart, pickup, manual reservation, admin.
2. **Commerce:** delivery, Stripe, PayPal where account support exists, email.
3. **Experience:** full CMS, vouchers, catering, gallery/events, AI.
4. **Hardening:** security, accessibility, SEO, observability, browser suite.

All tracks are in scope. A track may start only after the previous quality gate is green.

