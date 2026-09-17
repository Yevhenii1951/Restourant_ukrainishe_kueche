# KLN-022 - Settings, Exports, Dashboard and Audit

## Intent
Complete owner-operable administration with traceable sensitive changes.

## Delivers
Typed settings for hours/closures/tables/delivery/toggles, manager CSV exports, dashboard
operational aggregates, append-only audit viewer and retention-safe field selection.

## Blocked By
KLN-020, KLN-021.

## Verification Scenario
```text
GIVEN STAFF, MANAGER and ADMIN
WHEN each requests customer CSV and audit history
THEN MANAGER may export, only ADMIN may read audit, STAFF receives no raw data
```

## Requirements
FR-ADM-4, FR-ADM-6..8, NFR-SEC-1, AC-5.

## Acceptance Criteria
- CSV prevents spreadsheet formula injection and is audited.
- Aggregates exclude invalid/cancelled states and use Europe/Berlin day boundaries.
- Audit is append-only and before/after summaries redact PII/secrets.

## Non-Goals
No accounting, tax reports, BI warehouse or hard audit deletion UI.

