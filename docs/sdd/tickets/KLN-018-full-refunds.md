# KLN-018 - Full Refund Workflow

## Intent
Resolve paid cancellations through an admin-only idempotent full refund.

## Delivers
Refund action/record, pending/failed/retry/success states, Stripe adapter/webhook mapping,
admin reconciliation queue and mandatory reasons.

## Blocked By
KLN-017.

## Verification Scenario
```text
GIVEN a captured paid order cancelled by STAFF
WHEN ADMIN starts refund twice and success webhook is replayed
THEN one full provider refund exists and payment reaches refunded exactly once
```

## Requirements
FR-ORD-9, FR-ORD-10, NFR-REL-1, AC-2, AC-5.

## Acceptance Criteria
- Amount comes from captured payment, never client/admin input.
- Manager/Staff refund attempt forbidden.
- Failed refunds remain actionable and audited.

## Non-Goals
No partial refund, chargeback automation or cash refund tracking.

