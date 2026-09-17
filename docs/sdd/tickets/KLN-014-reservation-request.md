# KLN-014 - Pending Reservation Request

## Intent
Create concurrency-safe manual reservation requests and guest cancellation.

## Delivers
Request form, transactional allocation, pending hold/expiry, idempotency, opaque token,
status/cancellation page and retention-safe contact handling.

## Blocked By
KLN-013.

## Verification Scenario
```text
GIVEN one available table plan for a slot
WHEN two requests attempt allocation concurrently
THEN at most one receives a pending hold and the other receives a recoverable conflict
```

## Requirements
FR-RES-3, FR-RES-4, FR-RES-7, AC-3, AC-4.

## Acceptance Criteria
- Database-level overlap protection is tested with real concurrent transactions.
- Cancellation cutoff before/equal/after boundary tested.
- Cleanup expires stale pending holds idempotently.

## Non-Goals
No automatic confirmation or email provider.

