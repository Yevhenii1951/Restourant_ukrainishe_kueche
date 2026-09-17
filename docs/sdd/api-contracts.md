# API and Mutation Contracts

## Common Result

Server Actions return a discriminated union:

```ts
type ActionResult<T> =
  | { ok: true; data: T; correlationId: string }
  | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string[]>; correlationId: string }
```

Errors never expose SQL, provider messages, stack traces, record existence or secrets.
Use stable codes: `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `UNAVAILABLE`, `RATE_LIMITED`, `INVALID_STATE_TRANSITION`.

## Public Reads

| Contract | Input | Safe output |
| --- | --- | --- |
| `getMenu` | locale, category/filter/search | published item DTOs and allergen reference |
| `getRestaurantStatus` | instant/locale | open state, next opening, public contact/settings |
| `getDeliveryQuote` | PLZ, subtotal | eligibility, fee, minimum, free threshold |
| `getOrderSlots` | fulfilment, date | capacity-aware local slot labels + UTC instant |
| `getReservationSlots` | date, party size | available start instants; never expose table IDs |
| `getPublicOrder` | raw public token | safe status, snapshot, totals, estimate; masked contact |

## Commerce Actions

### `quoteCart`

Input: locale, fulfilment, PLZ if delivery, promo code, tip cents, lines with item
IDs, quantities and modifier option IDs. Output: opaque quote ID, expiry, normalized
lines, unavailable-line errors and itemized totals. Server ignores all submitted prices.

### `createOrder`

Input: quote ID, current cart payload, contact, delivery address when required,
fulfilment slot, payment method, optional voucher code, required idempotency key,
privacy acknowledgement version. Recompute in a transaction. Output: public token URL
and either Stripe redirect URL or cash confirmation. Same idempotency key/input returns
the original result; conflicting payload returns `CONFLICT`.

### `cancelPublicOrder`

Input: public token and reason category. Allowed only in `pending_confirmation`.
Return safe updated state. Never reveal whether a differently shaped token exists.

### Admin order actions

`transitionOrder(orderId, expectedVersion, targetState, reason?, estimate?)` uses
optimistic concurrency and the state machine. `refundOrder` is ADMIN-only, full amount,
idempotent and asynchronous until verified provider confirmation.

## Reservation Actions

### `createReservationRequest`

Input: locale, name, email, phone, party size, UTC start, seating preference, notes,
privacy acknowledgement and idempotency key. Transaction revalidates opening hours,
notice, duration, party limit and allocation. Output: public token URL, expiry and
`pending` status; table identity remains private.

### `cancelPublicReservation`

Input: public token. Server checks cutoff using Europe/Berlin business time and returns
the safe state. Repeated cancellation is idempotent.

### Admin reservation actions

`transitionReservation` uses expected version, required reason for decline/cancel and
rechecks table allocation on confirmation when necessary.

## Content/Admin Actions

- Every action requires active staff and explicit permission from the matrix.
- Create/update inputs contain typed localized fields, never arbitrary executable HTML.
- Rich text supports an allowlisted portable structure and is sanitized on write/render.
- Media upload uses signed upload intent with allowlisted image MIME, max 8 MB, decoded
  dimension validation, generated filename and no SVG upload.
- Delete defaults to archive/disable. Hard delete is limited to unreferenced drafts.
- Mutation includes `expectedVersion` to prevent silent overwrites.

## AI Route `POST /api/ai/chat`

Input: conversation ID cookie, locale and one message <= 2,000 chars. Validate origin,
rate and budget. Stream text events plus typed tool status; do not expose provider chain
of thought or raw tool/database errors. Tools:

- `searchMenu({ query, dietaryFlags })`
- `getOpeningHours({ date })`
- `getDeliveryInfo({ postalCode })`
- `checkReservationAvailability({ date, time?, partySize })`
- `searchFaq({ query })`

All tools are read-only, bounded and return public DTOs. No generic SQL/tool execution.

## Webhooks and Jobs

### `POST /api/stripe/webhook`

- Read raw body, verify signature before parsing domain data.
- Insert provider event ID before side effects; duplicate returns 2xx without replay.
- Load local payment by provider ID and verify amount/currency/metadata binding.
- Write payment/order/voucher/outbox changes atomically.
- Return 2xx only after durable processing or recognized duplicate.

### `POST /api/jobs/process-outbox`

Requires Vercel Cron authorization. Claims bounded batch, records attempts, schedules
retry and never sends the same logical notification twice.

### `POST /api/jobs/retention`

Expires pending reservation holds and deletes AI conversations with `expires_at < now()`.

## Rate-Limit Categories

Exact limits are environment configuration, not hardcoded claims. Separate buckets:
auth, checkout, token lookup, reservation/contact/catering, AI and admin exports.
Exceeded requests return 429 with a safe retry hint.

