# German Legal and Privacy Implementation Checklist

This is an engineering checklist, not legal advice. Real launch requires review with
the actual operator and processing details.

## Demo Status

- Footer and legal pages state: `Portfolio-Demo - kein realer Restaurantbetrieb`.
- Stripe remains in test mode; no real orders/vouchers or live commercial claims.
- Fictional contact/legal values are visibly placeholders, not attributed to a real entity.

## Provider Information

- Impressum is reachable from every page and contains the fields required by the
  actual entity under § 5 DDG when converted to a real site.
- Do not publish invented register, tax or supervisory information.
- Terms/AGB are labelled draft in the demo and professionally reviewed before live trade.

## Checkout Information

Before submission show clearly and prominently:

- essential item/modifier/quantity characteristics;
- fulfilment type, address/PLZ restrictions and requested time;
- total including VAT wording, delivery, discount, tip and voucher amount;
- accepted payment method and restaurant-confirmation rule;
- cancellation/refund information appropriate to prepared/perishable food;
- privacy link and terms acknowledgement where legally appropriate.

Paid submission button uses `Zahlungspflichtig bestellen` or an equally unambiguous
approved German formulation. Delivery restrictions and payment methods are visible at
the start of checkout. Prices and calculable delivery costs are displayed before order.

## Food Information

- Structured menu provides required allergen information before distance purchase.
- Reference all 14 regulated allergens; additives remain separate.
- Staff owns recipe accuracy. AI cannot override or certify safety.
- Cross-contamination/traces wording reflects real kitchen practice before launch.
- Alcohol, deposits, volume/quantity and age restrictions require separate specification
  if alcoholic/prepacked retail items are introduced.

## Privacy Inventory

| Processing | Data | Purpose/basis to document | Default retention |
| --- | --- | --- | --- |
| Order | contact, address, items, status | contract/pre-contract; legal retention review | operator-defined/legal |
| Reservation | contact, party/time/notes | pre-contract/legitimate operation review | short operational period |
| Catering | contact and request | pre-contract inquiry | delete after configured inactivity |
| Payment | provider IDs/status, no card data | contract/legal | provider/legal review |
| Staff auth | identity/session/role | access security | account lifecycle |
| AI | opaque session and messages | consent/legitimate basis review | five days |
| Analytics | configured usage data | consent/basis depends on setup | provider/configured |
| Map tiles | IP/request metadata at provider | consent/basis depends on provider | provider-controlled |

Privacy page must describe actual deployed behaviour, processors, international transfers,
rights, contact and retention. Never paste a generic policy that names unused services.

## Consent

- Technically necessary cart/session preferences do not trigger a cosmetic banner by themselves.
- Analytics and third-party map tiles remain disabled until the chosen consent/basis is implemented.
- Address, hours, telephone and external directions link work without map consent.
- Consent categories are granular, revocable and versioned; declining is as easy as accepting.
- Form privacy text acknowledges information; do not misuse consent when processing is required
  to perform the requested order/reservation.

## Accessibility and BFSG

Because the site offers ecommerce to consumers, implement checkout/payment to the
accessibility specification irrespective of whether a real microenterprise exemption could
later apply. Add an accessibility statement only if its claims match measured reality.

## Release Blockers

- Real legal entity and reviewed Impressum/Privacy/Terms.
- Verified allergens/additives and kitchen trace policy.
- Processor agreements/settings for Supabase, Vercel, Stripe, Brevo, AI, analytics and tiles.
- Retention/deletion schedule aligned with German tax and commercial record duties.
- Image/video licenses.
- Live-payment operational process, refund owner and customer support contact.

