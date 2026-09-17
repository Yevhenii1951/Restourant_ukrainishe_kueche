# Kalyna Business Specification

## Users and Roles

| User | Goal |
| --- | --- |
| Guest | Discover, order without an account, request a table, ask AI questions |
| Staff | Operate orders and reservations with minimal customer-data exposure |
| Manager | Staff capabilities plus menu, content and settings management |
| Admin | Full access, staff invitations, roles, audit and refunds |

## Functional Requirements

### Public and Localization

- **FR-PUB-1:** Serve `/de`, `/en`, and `/uk`; `/` redirects to the best supported locale, then German.
- **FR-PUB-2:** German is canonical. Missing EN/UK content renders German and marks the fallback for editors, never an empty block.
- **FR-PUB-3:** The site provides Home, Menu, Lunch, About, Reservation, Order, Cart, Checkout, Catering, Vouchers, Events, Gallery, Contact, Directions, FAQ, Impressum, Privacy and Terms pages.
- **FR-PUB-4:** Every page exposes address, current opening state, telephone fallback, reservation/order CTAs and demo disclosure where appropriate.
- **FR-PUB-5:** Only published, active content is public. Preview requires manager access.

### Menu and Cart

- **FR-MENU-1:** Guests can browse active categories and currently available dishes in configured order.
- **FR-MENU-2:** Search covers localized names/descriptions; filters cover vegan, vegetarian, spicy, popular and declared gluten-free suitability.
- **FR-MENU-3:** Every orderable item shows total price, portion/size where relevant, allergens, additives, dietary flags and availability.
- **FR-MENU-4:** A dish supports required/optional modifier groups with min/max selections and server-defined price deltas.
- **FR-CART-1:** A guest can add, change quantity, edit modifiers and remove cart lines.
- **FR-CART-2:** Cart persists in local storage without PII and is revalidated against the server before checkout.
- **FR-CART-3:** Cart UI may estimate totals, but the server response is authoritative.

### Ordering and Delivery

- **FR-ORD-1:** Guest checkout supports pickup and delivery without registration.
- **FR-ORD-2:** Fulfilment can be ASAP or a valid future slot generated from opening hours, lead time and capacity settings.
- **FR-ORD-3:** Delivery eligibility uses the exact normalized German PLZ and an active delivery-zone record.
- **FR-ORD-4:** One transaction creates an immutable order snapshot from current server data and returns an opaque public access token.
- **FR-ORD-5:** The server calculates subtotal, modifiers, discount, delivery, tip, voucher redemption and final total in integer EUR cents.
- **FR-ORD-6:** Checkout supports Stripe card, Stripe PayPal when enabled by the connected account, cash on pickup and cash on delivery.
- **FR-ORD-7:** All new orders require restaurant acceptance; successful payment alone does not accept an order.
- **FR-ORD-8:** A guest can view status and cancel with the public token only while the order is awaiting restaurant acceptance.
- **FR-ORD-9:** Admin can issue a full refund for a captured online payment; partial refunds are out of scope.
- **FR-ORD-10:** Webhook processing is signature-verified and idempotent. Browser redirects never mark an order paid.
- **FR-ORD-11:** Restaurant staff can make only valid state transitions and every transition is audited.
- **FR-ORD-12:** Promo codes support active window, fixed/percentage discount, minimum subtotal, redemption limit and server validation.
- **FR-ORD-13:** Optional tip is explicit, defaults to zero, and is calculated separately from minimum order and discounts.

### Reservations

- **FR-RES-1:** Guests request a reservation for a future slot and party size; no request is automatically confirmed.
- **FR-RES-2:** Availability is based on active tables, combinable groups, opening hours, closures, duration and existing held/confirmed reservations.
- **FR-RES-3:** A pending request holds its allocated table plan until staff confirms, declines, or the configured hold expires.
- **FR-RES-4:** Guests receive an opaque cancellation token and may cancel until four hours before the start.
- **FR-RES-5:** Staff can confirm, decline, cancel, seat, complete or mark no-show using valid transitions only.
- **FR-RES-6:** Seating preference is a non-binding note, never a guaranteed table selection.
- **FR-RES-7:** Concurrent requests cannot allocate the same table for overlapping time ranges.

### Admin and CMS

- **FR-ADM-1:** Staff accounts are invitation-only. There are no customer accounts.
- **FR-ADM-2:** Admin assigns `ADMIN`, `MANAGER`, or `STAFF`; users cannot alter their own role.
- **FR-ADM-3:** Menu/category/modifier CRUD validates translations, allergen links and price constraints.
- **FR-ADM-4:** Managers control availability, hours, closures, table inventory, capacity, delivery zones and commerce toggles.
- **FR-ADM-5:** Typed forms manage Home, About, FAQ, Events, Gallery, Catering, Lunch and legal-draft content; no generic block editor.
- **FR-ADM-6:** Staff can filter and operate orders/reservations; CSV export is manager-only and audited.
- **FR-ADM-7:** Sensitive admin actions create append-only audit events with actor, action, entity, before/after summary and timestamp.
- **FR-ADM-8:** Dashboard metrics are derived from non-cancelled orders in Europe/Berlin and never treated as accounting records.

### Vouchers, Catering and Email

- **FR-VCH-1:** Guests can purchase fixed-value vouchers with Stripe test mode and receive an unguessable code after webhook-confirmed payment.
- **FR-VCH-2:** Voucher redemption is transactional, supports partial remaining balance and cannot reduce an order below zero.
- **FR-CAT-1:** Catering form records an inquiry, rate-limits abuse and sends a staff notification; it does not create a contract or price quote.
- **FR-EML-1:** Localized transactional messages cover order, payment/refund, reservation, voucher and catering events.
- **FR-EML-2:** Email failure never rolls back a valid domain transaction; failed sends are recorded for retry.

### AI Assistant

- **FR-AI-1:** AI streams responses in the current locale about public restaurant data and site usage only.
- **FR-AI-2:** Typed read-only tools retrieve menu, opening hours, delivery fee, reservation availability and public FAQ.
- **FR-AI-3:** AI cannot mutate cart, orders, reservations, users or settings.
- **FR-AI-4:** AI never guarantees allergen safety and always directs allergy-sensitive guests to staff and canonical menu data.
- **FR-AI-5:** Conversation history is identified by an opaque cookie/session ID, contains no required PII and is deleted after five days.
- **FR-AI-6:** Per-IP/session limits, input/output limits and a configurable monthly budget disable the service safely when exceeded.

## Non-Functional Requirements

- **NFR-SEC-1:** Least-privilege grants, RLS and server role checks protect every data path.
- **NFR-SEC-2:** Auth, checkout, public-token, form, AI and webhook boundaries are rate-limited and validated.
- **NFR-SEC-3:** Secrets, full addresses, emails, phones, tokens and AI conversations never enter application logs.
- **NFR-PRV-1:** Data collection, retention and deletion follow `legal-compliance.md`.
- **NFR-A11Y-1:** Public and admin critical flows meet WCAG 2.2 AA acceptance checks.
- **NFR-PERF-1:** At the 75th percentile on mobile: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 for public landing/menu routes.
- **NFR-REL-1:** Payment/order webhooks and email jobs tolerate retries without duplicate side effects.
- **NFR-I18N-1:** Dates, money and time zones are locale-aware; stored timestamps remain UTC.
- **NFR-OBS-1:** Structured logs use correlation IDs and sanitized event metadata; failures are observable without PII.
- **NFR-TEST-1:** Tests never connect to development or production data and `npm run check` is mandatory per ticket.

## UX Requirements

- **UX-1:** On a 360 px viewport, menu, cart, reserve and call actions remain reachable without horizontal scroll.
- **UX-2:** Checkout shows fulfilment, item snapshot, modifiers, total price, delivery costs and payment method immediately before the payment button.
- **UX-3:** Loading, empty, offline, validation, expired-token and external-service failure states have useful recovery actions.
- **UX-4:** Status is never conveyed only by colour; focus and keyboard behaviour are visible and deterministic.
- **UX-5:** Motion is optional, subtle and disabled by `prefers-reduced-motion`.
- **UX-6:** Staff can accept a new order or reservation from a mobile device in at most three primary interactions after login.

## Success Metrics

- **M-1:** Critical pickup, delivery, reservation and admin browser scenarios pass from clean seed data.
- **M-2:** No high/critical findings in the final security review or automated accessibility scan.
- **M-3:** Every FR is linked to at least one ticket and verification scenario.
- **M-4:** A fresh developer can configure the demo from `.env.example` and README without hidden credentials.
- **M-5:** Public Core Web Vitals meet NFR-PERF-1 in a production preview measurement.

## Non-Goals

- **NG-1:** No customer accounts, loyalty programme or order history.
- **NG-2:** No live production payments or representation of a real restaurant.
- **NG-3:** No route optimization, courier tracking or driver application.
- **NG-4:** No inventory, supplier, kitchen-display or tax-accounting system.
- **NG-5:** No partial refunds, chargeback automation or voucher cash payout.
- **NG-6:** No AI write actions, nutrition/allergen diagnosis or unrestricted general chat.
- **NG-7:** No generic page builder, multi-tenant or multi-restaurant support.

## Global Acceptance Criteria

- **AC-1:** A manipulated browser price never changes the server total.
- **AC-2:** Replaying a Stripe event does not duplicate payment, voucher or email side effects.
- **AC-3:** Two concurrent reservation requests cannot hold the same table/time range.
- **AC-4:** A public order/reservation token cannot access a different record.
- **AC-5:** Staff cannot perform manager/admin actions through direct requests.
- **AC-6:** Missing EN/UK copy falls back to German without breaking metadata or checkout.
- **AC-7:** Removing analytics/map consent leaves address, telephone and ordering usable.
- **AC-8:** AI failure or budget exhaustion does not affect ordering or reservations.

