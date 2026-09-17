# Demo Seed Contract

All values are visibly fictional portfolio content. A real operator must replace and verify them.

## Identity

| Field | Demo value |
| --- | --- |
| Name | Kalyna - Ukrainische Küche |
| Legal display | Kalyna Demo-Restaurant (Portfolio-Projekt) |
| Address | Musterstraße 1, 34117 Kassel (nicht realer Standort) |
| Map | approximate Kassel centre, labelled demo location |
| Phone | +49 561 0000000 (Demo - nicht anrufen) |
| Email | hallo@kalyna-demo.example |
| Time zone | Europe/Berlin |
| Currency | EUR |

`.example` is intentionally non-deliverable. Tests use the fake email adapter or approved
sandbox recipients and never send seed messages to arbitrary real addresses.

## Hours and Tables

- Monday closed; Tuesday-Thursday 12:00-22:00; Friday-Saturday 12:00-23:00;
  Sunday 12:00-21:00.
- Tables: two x 2 seats, three x 4 seats and one x 6 seats.
- Combinations: one adjacent 2+2 group and selected 4+4 group only.
- Tests use fixed special-hours/closure dates, never today's date.

## Delivery

| Zone | PLZ | Fee | Minimum | Free from |
| --- | --- | ---: | ---: | ---: |
| Kassel Zentrum | 34117, 34119, 34121 | EUR 2.90 | EUR 15.00 | EUR 30.00 |
| Kassel Nord/Ost | 34123, 34125, 34127, 34128 | EUR 3.90 | EUR 20.00 | EUR 40.00 |
| Kassel West/Süd | 34130, 34131, 34132, 34134 | EUR 3.90 | EUR 20.00 | EUR 40.00 |
| Baunatal Demo | 34225 | EUR 5.90 | EUR 30.00 | EUR 60.00 |

These are demonstration rules, not a claim that a restaurant serves those areas.

## Menu

Seed Borschtsch, vegetarian Borschtsch, potato/cherry Varenyky, Deruny, Chicken Kyiv,
Banosh, Holubtsi, Syrnyky, Medivnyk, Uzvar and Kvass. Prices/descriptions may be adapted
from `beschreibung 1.md`; every allergen/additive/dietary field requires explicit seed review.

Include a required portion size, optional sour cream where appropriate, required Chicken
Kyiv side dish and one optional priced add-on. Never infer allergen safety from dish names.

## Accounts and Providers

- Seed creates no reusable plaintext staff password; bootstrap admin is environment-driven.
- Stripe stays test mode; AI/email use fake adapters by default.
- `DEMO10` exists only in test seed. Voucher codes are generated, never committed.

