# Business Rules

All monetary examples are configurable demo defaults, not real restaurant facts.

## Money and Pricing

- Currency is EUR; values are integer cents and must be non-negative.
- Menu prices include VAT in customer-facing output. Accounting/VAT reporting is out of scope.
- Authoritative line total: `(base price + selected modifier deltas) * quantity`.
- Subtotal is the sum of authoritative line totals before delivery, tip and vouchers.
- Percentage promo discounts round half-up to the nearest cent and never exceed the eligible subtotal.
- A fixed promo discount never makes the eligible subtotal negative.
- Only one promo code is accepted per order. A voucher may be combined with a promo.
- Minimum order applies after promo discount, before delivery fee, tip and voucher redemption.
- Delivery fee is determined by the active PLZ zone and is not discountable.
- Tip defaults to zero, is never preselected and is not counted toward minimum order.
- Voucher is a payment instrument: apply it after the final chargeable total is calculated.
- Server returns an itemized calculation; client-supplied totals are ignored.

## Demo Commerce Settings

| Setting | Demo default | Admin configurable |
| --- | ---: | --- |
| Pickup minimum | EUR 0.00 | yes |
| Delivery minimum | EUR 15.00 | yes, per zone |
| Free delivery threshold | EUR 30.00 | yes, per zone |
| ASAP lead time | 30 minutes | yes |
| Scheduled-order horizon | 14 days | yes |
| Slot interval | 15 minutes | yes |
| Max quantity per cart line | 20 | yes |

The implementation must seed these values rather than scatter constants through code.

## Fulfilment and Capacity

- Pickup requires name, email and phone. Delivery additionally requires street,
  house number, PLZ, city and optional delivery note.
- Only exact PLZ entries in active zones are eligible; city text does not override PLZ.
- Delivery address must be in Germany. PLZ is exactly five digits after normalization.
- Scheduled time must fall inside the matching fulfilment service window.
- Ordering is rejected when commerce is paused, the restaurant is closed for the
  slot, no order capacity remains, or any selected item/modifier is unavailable.
- ASAP means the earliest currently valid slot, not an unbounded promise.
- Cash-on-delivery is available only for delivery; cash-on-pickup only for pickup.
- Card and PayPal start Stripe Checkout. PayPal appears only when enabled by Stripe.

## Acceptance, Cancellation and Refund

- Every new valid order enters `awaiting_payment` for online payment or
  `pending_confirmation` for cash.
- A paid online order moves to `pending_confirmation` through a verified webhook.
- Restaurant acceptance creates the service commitment and estimated fulfilment time.
- Guest cancellation is allowed only in `pending_confirmation` through the public token.
- After acceptance, UI instructs the guest to telephone the restaurant; staff decides.
- Staff/admin may cancel any non-completed order with a mandatory reason.
- Cancelling a captured online payment creates `refund_pending`; only admin may initiate it.
- Successful full refund changes payment to `refunded`. Partial refund is not supported.
- Declined paid orders require a full refund; the dashboard keeps them actionable until complete.

## Reservations

| Rule | Demo default |
| --- | --- |
| Standard duration | 120 minutes |
| Booking horizon | 90 days |
| Minimum notice | 2 hours |
| Guest cancellation cutoff | 4 hours before start |
| Pending hold | 30 minutes during staff review |
| Maximum party size online | 12 guests |

- Requests larger than 12 are directed to telephone/catering inquiry.
- The system allocates one table or an explicitly configured combinable table group.
- Allocation chooses the smallest sufficient capacity to preserve larger tables.
- A request stores a seating preference but staff may assign another table.
- Overlap rule uses half-open ranges: `[starts_at, ends_at)`.
- `pending` and `confirmed` reservations block allocated tables; declined, cancelled,
  expired, completed and no-show reservations do not.
- Closures override weekly hours. Special opening hours override weekly hours for that date.
- Staff confirmation after a hold expired must re-run allocation in one transaction.

## Menu and Allergens

- A menu item is publishable only with German name, German description, price,
  category, portion label and explicit allergen review state.
- EN/UK fields may be absent and fall back to German.
- Fourteen regulated allergen types use reference records; do not store arbitrary labels.
- Additives use a separate reference list.
- `gluten_free` is an explicit staff-reviewed suitability flag and cannot be inferred
  solely by absence of a gluten allergen link.
- Canonical menu/allergen records override AI output and cached cart data.

## Voucher Rules

- Demo denominations are admin-configured; arbitrary customer values are not supported.
- Code is generated only after verified payment and is stored hashed; display once/email it.
- Redemption uses a database transaction and locks the balance row.
- A voucher may be redeemed across orders until balance is zero.
- Voucher purchases cannot be paid with another voucher.
- Expiry remains disabled in demo seed until legal review determines a valid policy.

## AI Rules

- Scope: menu, hours, location, delivery PLZ/fees, reservation availability, FAQ,
  site navigation and Ukrainian cuisine descriptions represented in approved content.
- Read-only tool results are authoritative context for volatile restaurant facts.
- No PII is required. The assistant asks users not to enter phone, email, address or payment data.
- Retention is five days from the last message; cleanup runs at least daily.
- Maximum message length: 2,000 characters. Maximum conversation: 30 retained messages.
- Rate limits and monthly cost budget come from environment/settings and fail closed.
- Allergy question response includes a warning and contact path; never says a dish is
  certainly safe from traces or cross-contamination.

