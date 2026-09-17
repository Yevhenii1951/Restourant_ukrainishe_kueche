# Implementation Plan

The agent implements every stage, tests it, performs a fresh review, fixes findings,
commits and pushes each ticket. It does not open or merge the PR.

## Stage 0 - Contract and Foundation

- KLN-001 project scaffold, exact dependency versions and environment validation.
- KLN-002 design tokens, locale shell, error/loading boundaries and base accessibility.
- KLN-003 Supabase environments, migration baseline, test DB fuse and seed system.
- KLN-004 staff auth, invitations, RBAC and protected admin shell.

Gate: lint, typecheck, unit/integration tests and production build green; no secrets.

## Stage 1 - Public Catalog and Content

- KLN-005 catalog schema, allergen/additive reference and public menu.
- KLN-006 search/filter/localization fallback and dish detail/modifiers.
- KLN-007 typed CMS, home/about/FAQ/lunch/events/gallery/catering content.
- KLN-008 contact, hours, consent-gated Leaflet, legal demo pages and local SEO.

Gate: published content path, CMS-to-public path, locale/a11y/SEO assertions pass.

## Stage 2 - Core Ordering

- KLN-009 persistent PII-free cart and modifier editing.
- KLN-010 server quote engine, promo/tip/delivery rules and capacity slots.
- KLN-011 guest pickup/cash checkout, transactional snapshot and public token status.
- KLN-012 admin order queue and validated transitions.

Gate: pickup browser scenario and forged-price/idempotency/IDOR tests pass.

## Stage 3 - Reservations

- KLN-013 tables/combinations/hours/closures and availability.
- KLN-014 pending request allocation, hold expiry and public cancellation.
- KLN-015 admin reservation queue/calendar and transition workflow.

Gate: concurrency test proves no double allocation; complete browser scenario passes.

## Stage 4 - Payments and Delivery

- KLN-016 PLZ delivery checkout and scheduled fulfilment.
- KLN-017 Stripe Checkout card/PayPal-capable configuration and webhook processing.
- KLN-018 full refund workflow and payment reconciliation UI.
- KLN-019 transactional email outbox, Brevo adapter and localized templates.

Gate: webhook replay/signature/amount mismatch and delivery E2E pass; Stripe stays test mode.

## Stage 5 - Extended Business Features

- KLN-020 voucher purchase, generation, balance and transactional redemption.
- KLN-021 catering workflow and staff notification.
- KLN-022 admin settings, exports, dashboard aggregates and append-only audit.

Gate: voucher concurrency, export authorization and audit tests pass.

## Stage 6 - AI Assistant

- KLN-023 streaming chat UI and provider adapter based on safe Oma Netz lessons.
- KLN-024 read-only tools, scope guard, allergen warning and multilingual behavior.
- KLN-025 five-day retention, budget/rate limits and scheduled cleanup.

Gate: fake-provider suite, adversarial prompts and AI failure browser scenario pass.

## Stage 7 - Hardening and Handover

- KLN-026 consent/analytics, CSP, security headers and privacy inventory verification.
- KLN-027 accessibility and performance remediation.
- KLN-028 full E2E suite, CI, security/spec review and documentation/handover.

Gate: all checks, build, critical browser scenarios and review findings resolved.

## Agent Review Loop Per Stage

After the last ticket of a stage:

1. Compare shipped behavior against every referenced FR/AC.
2. Review security, permissions, IDOR, validation, PII logs and error paths.
3. Run stage integration tests sequentially and browser scenario from clean seed.
4. Fix within a separate ticket/commit if behavior changes.
5. Update `handover.md` with evidence, not claims.
6. Push; report branch, commit, checks and remaining launch blockers.

