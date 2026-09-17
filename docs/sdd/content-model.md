# Content and Page Model

## Locale Rules

- Routes use `/de`, `/en`, `/uk`; `/` negotiates supported browser locale then German.
- German is required and canonical. EN/UK fall back field-by-field to German.
- Locale switch preserves the equivalent route where available.
- Slugs remain stable German/neutral identifiers; translated display names do not change URLs.
- Money uses locale formatting with EUR; business dates use Europe/Berlin.

## Public Sitemap

| Route | Purpose | Primary CTA | Data source |
| --- | --- | --- | --- |
| `/[locale]` | Brand, popular food, hours, trust, location | order/reserve | content + catalog/settings |
| `/speisekarte` | Browsable canonical menu/allergens | add/order | catalog |
| `/mittagstisch` | Current lunch offer and validity | order | typed content/catalog |
| `/bestellen` | Order-enabled catalog | cart | catalog/settings |
| `/warenkorb` | Cart edit and fulfilment start | checkout | browser + quote action |
| `/kasse` | Contact, delivery, slot, payment, legal summary | pay/order | dynamic |
| `/bestellung/[token]` | Safe order confirmation/status/cancel | call/cancel | safe token projection |
| `/reservierung` | Availability and manual request | request | reservation/settings |
| `/reservierung/[token]` | Confirmation/status/cancellation | cancel/call | safe token projection |
| `/ueber-uns` | Fictional story/team with demo disclosure | reserve | content |
| `/catering` | Inquiry, not binding quote | send inquiry | content + form |
| `/gutscheine` | Test-mode voucher denominations | purchase | voucher products |
| `/events` | Upcoming published events | reserve/contact | events |
| `/galerie` | Licensed food/space images | order/reserve | gallery/media |
| `/kontakt` | Address, phone, hours, map consent | call/directions | settings |
| `/anfahrt` | Directions and transit/access notes | external directions | content/settings |
| `/faq` | Restaurant/order/reservation answers | contact | FAQ |
| `/impressum` | Demo legal identity disclosure | none | legal draft |
| `/datenschutz` | Actual implemented processing disclosure | preferences | legal draft |
| `/agb` | Demo commerce terms with status warning | none | legal draft |

Localized prefixes apply to every public route. Token pages are `noindex` and no-store.

## Home Blocks

1. Hero: traditional Ukrainian food, clear Kassel/demo identity, order/reserve CTAs.
2. Today: open state, next opening and service availability.
3. Signature dishes: maximum four, database-driven.
4. Story: Ukrainian hospitality without stereotypes or unsupported authenticity claims.
5. Dietary/allergen access: links to canonical menu information.
6. Pickup/delivery explanation with PLZ check.
7. Events/gallery preview.
8. Location: address always visible; interactive tiles require consent/configured basis.
9. FAQ preview.
10. Final order/reserve CTA and demo disclosure.

## Typed CMS Forms

| Form | Fields |
| --- | --- |
| Site identity | localized business descriptor, contact, social links, demo disclosure |
| Home | localized hero, story teaser, selected signature item IDs, CTA visibility |
| About | localized story sections, team entries, media references |
| FAQ | localized question/answer, category, sort, publication |
| Lunch | validity dates, linked items or localized entries, publication |
| Event | localized title/summary/body, start/end, capacity note, image, publication |
| Gallery | image, localized caption/alt, sort, publication |
| Catering | localized intro, constraints, expected response copy |
| Legal drafts | versioned localized plain/allowlisted rich text; admin-only publish |

Operational values such as hours, delivery fees and limits are settings/domain forms,
not arbitrary CMS text.

## Copy Constraints

- No fabricated customer testimonials, awards, press mentions or health claims.
- `hausgemacht`, `authentisch`, organic/local sourcing and similar claims may be used
  only if explicitly represented as fictional demo copy or later verified by an operator.
- Allergens/prices come from structured data, never duplicated in marketing prose.
- AI disclaimer and demo disclosure are translated and always visible where relevant.

