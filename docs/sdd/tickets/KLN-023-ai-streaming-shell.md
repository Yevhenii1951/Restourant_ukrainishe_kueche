# KLN-023 - Streaming AI Shell

## Intent
Add resilient multilingual chat UX without domain tools or mutations.

## Delivers
Accessible launcher/panel, streaming route/provider interface, fake provider, current-locale
prompt, scope disclaimer, abort/retry and disabled/provider-failure contact fallback.

## Blocked By
KLN-008, KLN-022.

## Verification Scenario
```text
GIVEN AI provider fails after chat opens
WHEN a guest sends a valid message
THEN UI stops loading, shows menu/contact fallback, returns focus correctly, and ordering works
```

## Requirements
FR-AI-1, FR-AI-3, UX-3, NFR-A11Y-1, AC-8.

## Acceptance Criteria
- Oma Netz XML-tag mutation pattern is not copied; no write capability exists.
- Streaming announcements are batched; reduced motion honored.
- No PII, raw prompts/provider errors in logs.

## Non-Goals
No voice, history, tools or paid-provider calls in automated tests.

