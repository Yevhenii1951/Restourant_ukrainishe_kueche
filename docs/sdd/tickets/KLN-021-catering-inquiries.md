# KLN-021 - Catering Inquiry Workflow

## Intent
Collect and manage non-binding catering requests safely.

## Delivers
Localized form, rate limiting/honeypot, validated inquiry, public acknowledgement,
staff queue/transitions and outbox notification.

## Blocked By
KLN-007, KLN-019.

## Verification Scenario
```text
GIVEN a valid first inquiry and repeated submissions beyond configured limit
WHEN the guest submits them
THEN one valid inquiry is stored/notified and abusive attempts receive a safe rate response
```

## Requirements
FR-CAT-1, NFR-SEC-2, NFR-PRV-1.

## Acceptance Criteria
- Copy says inquiry is not quote/contract.
- Contact/message never enters logs or analytics.
- Workflow transitions follow state machine and are audited.

## Non-Goals
No automatic pricing, deposit, contract or event planning.

