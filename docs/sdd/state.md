# SDD Session State (KLN-017)

## Done
- **KLN-017 — Stripe Checkout and Payment Truth** implemented on
  `feature/kln-017-stripe-checkout-webhook`; ready for PR merge after green checks.
- Previous baseline: KLN-016 merged via PR #21 (`main` @ 1ae61b1).

## Finished this session
- Added Stripe test-mode checkout path for pickup/delivery online payment: card by default, PayPal only behind `STRIPE_PAYPAL_ENABLED=true`.
- Added `awaiting_payment` and `payment_failed` order states, local `payments` and `payment_events`, Stripe checkout binding, and verified webhook payment truth.
- Public return/status page only displays/polls stored state; it never marks an order paid.
- Checkout UI now supports cash, card, and configured PayPal while keeping server-side quote/order recalculation authoritative.

## Test results
- `npm run check` green: lint (1 pre-existing warning in `src/features/delivery/adminActions.ts`), typecheck, 178 unit tests, 84 integration tests.
- New KLN-017 integration (2): signed successful Stripe event replay is idempotent; amount mismatch and invalid signature fail safely.

## Next steps
- Merge KLN-017 PR after branch push/PR checks.
- Continue with KLN-018 full refund workflow.

## Env
- Required for real checkout: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `URL`, `QUOTE_SIGNING_SECRET`, database/Supabase service env.
- Optional: `STRIPE_PAYPAL_ENABLED=true` only when the connected Stripe account supports PayPal.
