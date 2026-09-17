# KLN-012 - Admin Order Operations

## Intent
Let restaurant staff operate pickup orders safely.

## Delivers
Mobile order queue/detail, minimum customer data, accepted estimate, state transitions,
optimistic versioning, availability toggle and append-only status/audit events.

## Blocked By
KLN-004, KLN-011.

## Verification Scenario
```text
GIVEN STAFF opens a pending order at version 2 in two sessions
WHEN one accepts it and the other attempts cancellation with stale version 2
THEN acceptance succeeds, stale mutation conflicts, and both attempts are auditable
```

## Requirements
FR-ORD-11, FR-ADM-6, FR-ADM-7, UX-6, AC-5.

## Acceptance Criteria
- Invalid transitions rejected in domain and API tests.
- Staff cannot export, refund or edit menu price.
- Completed/cancelled orders remain immutable except authorized notes/audit.

## Non-Goals
No payment reconciliation, refund or revenue accounting.

