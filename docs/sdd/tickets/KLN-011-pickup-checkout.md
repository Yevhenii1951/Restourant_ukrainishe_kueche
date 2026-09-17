# KLN-011 - Guest Pickup and Public Order

## Intent
Complete the first end-to-end order with cash on pickup.

## Delivers
Accessible checkout, contact validation/privacy acknowledgement, transactional recalculation
and snapshot, idempotency, opaque status/cancel token, confirmation page and no-store controls.

## Blocked By
KLN-010.

## Verification Scenario
```text
GIVEN a valid pickup quote and idempotency key
WHEN the same cash checkout request is submitted twice
THEN one pending-confirmation order exists and both responses identify the same order
```

## Requirements
FR-ORD-1, FR-ORD-4, FR-ORD-7, FR-ORD-8, NFR-REL-1, AC-1, AC-4.

## Acceptance Criteria
- Token stored hashed and safe projection masks contact.
- Cancel allowed only pending confirmation and is idempotent.
- Final button/summary meet legal and accessibility contracts.

## Non-Goals
No delivery, Stripe, email or staff acceptance UI.

