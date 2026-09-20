# SDD Session State (KLN-016)

## Done
- **KLN-016 — PLZ delivery and scheduled orders** implemented on
  `feature/kln-016-delivery-checkout`, merged via PR #21
  (`main` @ 1ae61b1).

## Finished this session
- Migration `0013_delivery_orders.sql`: enables `cash_delivery`, creates
  RLS-protected `order_delivery_addresses`, and adds transactional
  `insert_delivery_order(...)` with delivery capacity recheck and immutable
  address/item snapshots. Public token projections never select the address.
- `createDeliveryOrder`: strict delivery input/address schema, normalized exact
  PLZ matching between quote and address, quote-token payload verification,
  server price/zone/minimum/free-threshold recomputation, delivery slot recheck,
  idempotency replay/conflict and cash-delivery-only method.
- Public checkout: selected slots for both fulfilments; delivery adds street,
  house number, read-only normalized PLZ, city and optional note.
- `service_windows` retain `fulfilment` through the quote store; slots now filter
  delivery/pickup windows correctly. This fixed delivery incorrectly seeing
  pickup hours.
- Manager admin: `/admin/lieferzonen` exact-PLZ/fee/min/free forms and
  `/admin/lieferzeiten` delivery window/capacity form. Existing DB trigger
  prevents active PLZ overlap. Delivery address appears only in staff order
  detail, never list/public status.

## Test results
- `npm run check` green: lint + typecheck + 178 unit + 82 integration.
- New KLN-016 integration (3): server fee + address snapshot, an unlisted
  five-digit PLZ persists no order, delivery rejects `cash_pickup`, and DB
  rejects active PLZ overlap.

## Next steps
- KLN-017 Stripe checkout/webhook. This is payment/signature/idempotency work;
  switch to `5.5 medium` if the current model starts struggling with it.
- KLN-018..028 out of scope.

## Env
- `npm run check` local green on `kalyna_test`; main @ 1ae61b1.
