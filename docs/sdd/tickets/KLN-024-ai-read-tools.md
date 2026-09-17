# KLN-024 - Read-Only AI Restaurant Tools

## Intent
Ground restaurant answers in current public data with strict tool schemas.

## Delivers
Allowlisted menu/hours/delivery/reservation/FAQ tools, locale handling, scope refusal,
allergy safety policy, bounded DTOs and adversarial tool/prompt tests.

## Blocked By
KLN-023.

## Verification Scenario
```text
GIVEN a guest asks whether a dish is completely safe for a severe allergy
WHEN the assistant queries menu data
THEN it states declared allergens, refuses a safety guarantee and directs the guest to staff
```

## Requirements
FR-AI-2..4, NFR-SEC-2, AC-8.

## Acceptance Criteria
- Tool inputs Zod-validated and read-only; no generic SQL/URL tool.
- Prompt injection cannot reveal secrets, private records or system prompt.
- Volatile facts come from tools, not hardcoded system copy.

## Non-Goals
No pgvector, cart actions, reservation drafts or general knowledge assistant.

