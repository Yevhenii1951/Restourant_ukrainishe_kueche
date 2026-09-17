# KLN-025 - AI History, Retention and Cost Limits

## Intent
Provide five-day continuity while bounding privacy risk and provider spend.

## Delivers
Opaque conversation cookie/hash, 30-message cap, five-day expiry refresh/deletion,
input/output limits, per-IP/session rate buckets, configurable monthly budget and cleanup job.

## Blocked By
KLN-024.

## Verification Scenario
```text
GIVEN conversations just before and exactly at five-day expiry plus exhausted budget
WHEN retention and chat routes run
THEN expired data is deleted and new AI calls fail closed with core-site fallback
```

## Requirements
FR-AI-5, FR-AI-6, NFR-PRV-1, NFR-REL-1.

## Acceptance Criteria
- Missing budget disables paid calls; no invented EUR amount.
- Messages warn against PII and obvious PII is redacted/rejected per policy.
- Cleanup, cap and rate/budget tests use fake clock/provider.

## Non-Goals
No indefinite memory, staff transcript search or model training.

