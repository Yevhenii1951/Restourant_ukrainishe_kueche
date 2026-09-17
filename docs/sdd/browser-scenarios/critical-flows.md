# Critical Browser Scenarios

Run against deterministic demo seed and a dedicated test database.

## BS-1 Guest Pickup Order

```text
GIVEN German locale, an available dish with a required modifier, and empty cart
WHEN a guest adds the dish, selects pickup/ASAP, enters contact data and cash payment
THEN the final summary shows server totals, the order is pending confirmation,
AND the token page shows the same snapshot without exposing another customer's data
```

## BS-2 Delivery and Online Payment

```text
GIVEN an eligible PLZ and Stripe test configuration
WHEN a guest selects delivery, a future slot and card payment
THEN delivery minimum/fee are enforced, Checkout opens, a verified webhook marks paid,
AND the order still waits for restaurant acceptance
```

## BS-3 Invalid Delivery Recovery

```text
GIVEN a cart and a PLZ outside every active zone
WHEN delivery is selected
THEN checkout is blocked with the reason, pickup remains selectable,
AND cart contents and non-sensitive inputs are preserved
```

## BS-4 Reservation Request and Cancellation

```text
GIVEN a table combination that fits four guests and a future available slot
WHEN a guest submits a request and later follows the cancellation link before cutoff
THEN the request is pending, no table identity is public, cancellation succeeds,
AND the slot becomes available again
```

## BS-5 Staff Operations and RBAC

```text
GIVEN one STAFF and one MANAGER account
WHEN STAFF accepts an order and attempts to edit its dish price
THEN order acceptance succeeds but menu editing is forbidden;
WHEN MANAGER edits/publishes the dish
THEN the public menu displays the change after invalidation
```

## BS-6 Stripe Refund

```text
GIVEN an accepted paid order cancelled by staff
WHEN ADMIN starts a full refund and the refund webhook succeeds
THEN payment becomes refunded exactly once and localized notification is queued
```

## BS-7 Voucher

```text
GIVEN a webhook-confirmed active voucher with EUR 25 balance
WHEN EUR 10 is redeemed on an order
THEN the order charge is reduced by EUR 10 and voucher balance is EUR 15;
WHEN the same request is replayed
THEN no second redemption occurs
```

## BS-8 AI Degradation

```text
GIVEN AI is available
WHEN a guest asks about hours, delivery and allergy safety
THEN read-only tools supply current facts and the allergy answer includes the warning;
WHEN the provider or budget fails
THEN contact/menu alternatives appear and ordering still works
```

## BS-9 Consent and Accessibility

```text
GIVEN analytics/map consent is declined and reduced motion is enabled
WHEN a keyboard-only guest completes menu, cart and reservation navigation
THEN no optional third-party request is made, address/phone remain available,
AND focus, errors, totals and confirmations are perceivable
```

