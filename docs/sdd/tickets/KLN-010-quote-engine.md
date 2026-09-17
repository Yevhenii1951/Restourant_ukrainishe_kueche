# KLN-010 - Server Quote Engine

## Intent
Make all checkout money and delivery rules server-authoritative.

## Delivers
Quote action, item/modifier lookup, subtotal/promo/tip/minimum/delivery/free-threshold rules,
PLZ validation, capacity-aware fulfilment slots, 10-minute quote and itemized UI.

## Blocked By
KLN-009.

## Verification Scenario
```text
GIVEN a client submits forged prices and subtotal exactly one cent below delivery minimum
WHEN quoteCart runs for an eligible PLZ
THEN forged values are ignored and delivery checkout is rejected with server-calculated totals
```

## Requirements
FR-CART-3, FR-ORD-2, FR-ORD-3, FR-ORD-5, FR-ORD-12, FR-ORD-13, AC-1.

## Acceptance Criteria
- All pricing boundary tests from testing strategy exist.
- Quote ID opaque and expiring; quote never authorizes stale checkout alone.
- Europe/Berlin slots serialize as unambiguous UTC instants.

## Non-Goals
No order persistence, voucher or payment.

