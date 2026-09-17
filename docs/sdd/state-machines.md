# State Machines

Transitions not listed here are rejected server-side with `INVALID_STATE_TRANSITION`.

## Order

```text
draft
  -> awaiting_payment        online payment selected
  -> pending_confirmation    valid cash order submitted

awaiting_payment
  -> pending_confirmation    payment webhook: paid
  -> payment_failed          terminal/expired Stripe session
  -> cancelled               guest abandons/expires before payment

pending_confirmation
  -> accepted                staff accepts and supplies estimate
  -> cancelled               guest or staff cancels

accepted -> preparing -> ready
ready -> completed           pickup
ready -> out_for_delivery -> completed   delivery

accepted|preparing|ready|out_for_delivery -> cancelled   staff only, reason required
```

Terminal order states: `completed`, `cancelled`, `payment_failed`.
Paid cancellation remains operationally open until the payment reaches `refunded`.

## Payment

```text
unpaid -> checkout_created -> paid
checkout_created -> failed|expired
paid -> refund_pending -> refunded
refund_pending -> refund_failed -> refund_pending
```

Order and payment states are separate. An order may be cancelled while payment is
`refund_pending`. Only webhook events finalize `paid` or `refunded`.

## Reservation

```text
pending -> confirmed|declined|expired|cancelled
confirmed -> seated|cancelled|no_show
seated -> completed
```

- Guest may cause `pending|confirmed -> cancelled` before cutoff.
- Staff may perform all listed transitions permitted by role.
- Expiry is a server job and applies only to pending holds.
- Confirmation after hold expiry creates a new allocation or fails with no availability.

## Catering Inquiry

```text
new -> contacted -> quoted -> confirmed
new|contacted|quoted -> cancelled
```

The state is internal workflow only; `quoted` does not constitute a contract in the demo.

## Voucher

```text
payment_pending -> active -> depleted
payment_pending -> payment_failed
active -> disabled
disabled -> active          admin with reason
```

Balance, not a free-form status change, causes `depleted`.

## Menu Publication

```text
draft -> published -> archived
published -> draft          unpublish
archived -> draft           restore for editing
```

Availability is separate from publication so sold-out items remain visible when configured.

