# KLN-013 - Table Inventory and Availability

## Intent
Model real restaurant tables and compute honest request slots.

## Delivers
Tables/combinations, weekly/special hours, closures, duration/notice/horizon rules,
smallest-fit allocation planner and public availability without table identities.

## Blocked By
KLN-003, KLN-004.

## Verification Scenario
```text
GIVEN tables for 2 and 4, a four-person request and a closure overlapping one candidate
WHEN availability is queried
THEN only open non-overlapping slots appear and the smallest valid table plan is selected privately
```

## Requirements
FR-RES-1, FR-RES-2, FR-RES-6, NFR-I18N-1.

## Acceptance Criteria
- Half-open range and DST boundary tests exist.
- Manager CRUD validates combination membership/capacity.
- Public response never reveals internal table labels/IDs.

## Non-Goals
No reservation persistence or automatic confirmation.

