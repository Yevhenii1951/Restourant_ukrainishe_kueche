# KLN-003 - Database and Test Foundation

## Intent
Create safe Supabase migration/test infrastructure before domain data exists.

## Delivers
Server/browser clients, SQL migration convention, development/test/production separation,
database fuse, deterministic seed runner, grants/RLS test harness and correlation IDs.

## Blocked By
KLN-001.

## Verification Scenario
```text
GIVEN a database URL marked as development or production
WHEN the integration suite starts
THEN it aborts before migrations, reset, seed or any data mutation
```

## Requirements
NFR-SEC-1, NFR-TEST-1. Read database-schema, testing-strategy, security.

## Acceptance Criteria
- No fallback database URL; local/test setup documented.
- Migration and seed commands are repeatable.
- Baseline privilege test proves anon cannot access a private fixture table.

## Non-Goals
No catalog schema or hosted project creation through automation.

