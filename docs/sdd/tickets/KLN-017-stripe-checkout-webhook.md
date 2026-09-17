# KLN-017 - Stripe Checkout and Payment Truth

## Intent
Add online card and account-enabled PayPal payment in Stripe test mode.

## Delivers
Checkout session creation, local payment binding, raw-body signature verification,
idempotent event processing, amount/currency checks and paid pending-confirmation order.

## Blocked By
KLN-016.

## Verification Scenario
```text
GIVEN one signed successful Stripe event for a bound order
WHEN the event is delivered twice
THEN one payment becomes paid, one order transition occurs, and no side effect duplicates
```

## Requirements
FR-ORD-6, FR-ORD-7, FR-ORD-10, NFR-REL-1, AC-2.

## Acceptance Criteria
- Invalid signature and mismatched amount/currency fail safely.
- Return page polls/displays state but never marks paid.
- PayPal shown only when Stripe configuration supports it.

## Non-Goals
No live mode, saved cards, direct card handling or refunds.

