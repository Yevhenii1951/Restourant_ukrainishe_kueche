# KLN-019 - Transactional Email Outbox

## Intent
Send localized messages without coupling provider availability to transactions.

## Delivers
Outbox/delivery schema, Brevo adapter, fake test adapter, localized order/reservation/payment
templates, bounded retries/dead letter, cron authentication and idempotent sends.

## Blocked By
KLN-015, KLN-018.

## Verification Scenario
```text
GIVEN a committed order and an email provider that fails once
WHEN the outbox job runs twice
THEN the order remains valid, the email retries, and one logical message is delivered
```

## Requirements
FR-EML-1, FR-EML-2, NFR-REL-1, NFR-OBS-1.

## Acceptance Criteria
- Email recipient/content absent from logs; provider ID retained safely.
- SPF/DKIM/DMARC documented, not falsely configured.
- Token links use correct locale and no analytics parameters.

## Non-Goals
No SMS, push, bulk marketing or real sender-domain setup.

