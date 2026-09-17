# KLN-009 - Persistent PII-Free Cart

## Intent
Create an accessible guest cart that persists only product selections locally.

## Delivers
Add/edit/remove/quantity flows, required modifiers, local-storage versioning, stale cart
revalidation feedback, mobile sticky summary and full cart route.

## Blocked By
KLN-006.

## Verification Scenario
```text
GIVEN a valid dish with required modifier in cart
WHEN the browser reloads and that option has become unavailable
THEN non-sensitive cart state restores, checkout is blocked, and the guest can repair the line
```

## Requirements
FR-CART-1, FR-CART-2, UX-1, UX-3.

## Acceptance Criteria
- Storage contains IDs/quantity only, no contact/address or trusted price.
- Quantity boundaries and modifier rules tested.
- Cart changes are keyboard/screen-reader usable.

## Non-Goals
No server cart account sync or authoritative totals.

