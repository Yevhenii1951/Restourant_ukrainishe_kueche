# KLN-030 - Meine Anfragen (guest status overview)

## Intent
Give guests a single, account-free page to see the status of their orders and
reservations identified by their phone number.

## Delivers
Public `/meine-anfragen` page: guest enters the phone number used at checkout /
reservation, sees a read-only list of matching order and reservation summaries
(number, type, status, upcoming time, total/party), rate-limited and localized.
Token links and in-page cancellation stay out of scope (the token flow already
covers those).

## Blocked By
None (independent of KLN-029; built on top of the rebrand branch).

## Verification Scenario
```text
GIVEN one pickup order and one pending reservation stored under the same phone
WHEN a guest looks up that phone on /meine-anfragen
THEN both entries appear with status and no contact details
AND a phone without entries yields an honest "nothing found" state
```

## Requirements
FR-PUB-3 (new page), NFR-SEC-2 (lookup rate limit), NFR-PRV-1.
Amends NG-1: no customer accounts; a phone-identified read-only overview is the
only guest lookup surface.

## Acceptance Criteria
- Lookup requires a valid phone (3..30 chars); at least five characters after trim.
- Only the guest's own rows are returned (match on `guest_phone`), summaries
  expose no PII other than the look-up phone itself.
- Lookups are rate-limited per IP + phone and the action fails closed without a DB.
- Missing EN/UK copy falls back to German; the page is in sitemap and footer.
- Orders/reservations are sorted newest first, capped at 50 entries each.

## Non-Goals
No customer accounts, no email-based lookup (orders store no email by design),
no cancellation from this page, no token-link recovery.