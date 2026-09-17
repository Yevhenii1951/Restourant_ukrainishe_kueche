# KLN-015 - Admin Reservation Operations

## Intent
Let staff review and operate reservation requests without double-booking.

## Delivers
List/week views, filters, detail, confirm/decline/cancel/seat/complete/no-show transitions,
allocation recheck after expiry, reasons, version conflict and audit events.

## Blocked By
KLN-012, KLN-014.

## Verification Scenario
```text
GIVEN a pending request whose hold expired and whose former table was taken
WHEN STAFF tries to confirm it
THEN allocation is recalculated atomically or confirmation fails without overlap
```

## Requirements
FR-RES-5, FR-ADM-6, FR-ADM-7, UX-6, AC-3.

## Acceptance Criteria
- Invalid/stale transitions rejected.
- Staff sees customer fields only for operational need.
- BS-4 passes from clean seed.

## Non-Goals
No CSV export or email delivery yet.

