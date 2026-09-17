# Database Schema Contract

This is the logical contract. Implementation uses SQL migrations, enums/checks,
foreign keys, indexes, grants and RLS. All IDs are UUID unless stated otherwise.

## Catalog and Content

| Table | Required fields and constraints |
| --- | --- |
| `categories` | `slug unique`, localized names JSON, `sort_order`, publication state |
| `menu_items` | category FK, slug unique, localized text JSON, `base_price_cents >= 0`, portion, flags, publication/availability state, image FK |
| `modifier_groups` | item FK, localized name, min/max selections, required, sort; `0 <= min <= max` |
| `modifier_options` | group FK, localized name, `price_delta_cents`, available, sort |
| `allergens` | stable EU code unique, localized label |
| `menu_item_allergens` | item/allergen composite PK, containment type (`contains`, `may_contain`) |
| `additives` | stable code unique, localized label |
| `menu_item_additives` | item/additive composite PK |
| `media_assets` | storage path unique, mime, dimensions, localized alt, license status/source |
| `content_entries` | typed key unique, localized structured payload, draft/published state, version |
| `events` | localized content, start/end, publication state, image FK |
| `gallery_items` | media FK, localized caption, sort, publication state |
| `faqs` | localized question/answer, category, sort, publication state |

Localized JSON shape is `{ "de": string, "en"?: string, "uk"?: string }`.
Database constraints require non-empty `de`; application provides fallback.

## Commerce

| Table | Required fields and constraints |
| --- | --- |
| `delivery_zones` | name, exact `postal_codes text[]`, fee/min/free threshold cents, active; no overlapping active PLZ |
| `service_windows` | fulfilment type, weekday/date override, open/close local times, capacity per slot |
| `closures` | start/end timestamptz, reason, affected service |
| `promo_codes` | normalized code hash/lookup, type, value, min, window, limit, active |
| `orders` | number unique, public token hash unique, idempotency key unique, fulfilment, schedule, customer/address encrypted or protected, money breakdown, order/payment states, currency `EUR`, version |
| `order_items` | order FK, source item nullable, localized name snapshot, base/unit/line cents, quantity, allergen snapshot |
| `order_item_modifiers` | order item FK, option source nullable, group/option snapshot, delta cents, quantity |
| `order_status_events` | order FK, from/to, actor nullable, reason, created_at; append-only |
| `payments` | order/voucher purchase FK, provider, provider IDs unique, amount/currency, state, timestamps |
| `payment_events` | provider event ID unique, type, sanitized payload metadata, processed/result |
| `refunds` | payment FK, provider refund ID unique, full amount, state, reason, actor |
| `voucher_products` | denomination, active, sort |
| `vouchers` | code hash unique, original/remaining cents, state, purchase/payment links |
| `voucher_redemptions` | voucher/order FK, amount > 0, unique idempotency key |

Customer contact columns are never exposed to `anon`/`authenticated` Data API roles.
Public status functions accept a token, hash it server-side and return a safe projection.

## Reservations

| Table | Required fields and constraints |
| --- | --- |
| `restaurant_tables` | internal label unique, capacity > 0, area, active |
| `table_combinations` | name unique, capacity > 0, active |
| `table_combination_members` | combination/table composite PK |
| `reservations` | public token hash unique, customer contact, party size, start/end, status, preference, notes, expiry, version |
| `reservation_allocations` | reservation/table composite PK, start/end mirror, blocking flag |
| `reservation_status_events` | reservation FK, from/to, actor, reason, append-only |

Use an exclusion constraint on table allocation time ranges for blocking states,
or an equivalent transactional database function with advisory/row locking. A
plain application `SELECT` followed by `INSERT` is insufficient.

## Identity and Operations

| Table | Required fields and constraints |
| --- | --- |
| `staff_profiles` | `auth.users` FK unique, display name, role, active |
| `staff_invitations` | email, role, token hash, expiry, accepted_at, inviter |
| `settings` | typed key unique, versioned JSON value, updated_by |
| `audit_events` | actor, action, entity type/id, redacted before/after JSON, correlation ID, timestamp; append-only |
| `outbox_events` | event type, aggregate/id, payload, attempts, available/processed/dead timestamps, idempotency key unique |
| `email_deliveries` | outbox FK, recipient hash, template/locale, provider message ID, state/errors |
| `catering_inquiries` | contact, date, guests, budget, message, workflow state, public token hash |
| `ai_conversations` | opaque session ID hash, locale, expires_at, created/updated |
| `ai_messages` | conversation FK, role, sanitized content, token count, created_at |

## Required Indexes

- Active catalog: `(publication_state, availability_state, category_id, sort_order)`.
- Orders: `(created_at desc)`, `(order_state, scheduled_at)`, `(customer_email_hash)`.
- Reservations: `(starts_at, ends_at, status)` and allocation table/time indexes.
- Outbox: partial index on `(available_at)` where `processed_at is null`.
- AI cleanup: `(expires_at)`.
- Audit: `(entity_type, entity_id, created_at desc)` and `(actor_id, created_at desc)`.

## Grants and RLS

- `anon`: select only safe published catalog/content views. No direct operational table access.
- `authenticated`: no blanket access; staff policies use verified role claims/profile joins.
- Browser public mutations: none directly. Next.js server performs validated operations.
- Server secret key: isolated in server-only client and guarded by application authorization.
- Storage: public read only for approved published media; manager write with MIME/size policies.
- RLS tests assert both allowed and denied operations for every exposed table/view.

## Retention Jobs

- AI messages/conversations: delete after five days.
- Expired public access tokens: retain hash only as required with domain record.
- Payment/audit/order retention: configurable and subject to real tax/legal review.
- Unsubmitted carts: browser-only; no server retention.
- Failed spam form attempts: short-lived rate-limit counters, not permanent profiles.

