# KLN-001 - Application Foundation

## Intent
Create a reproducible Next.js 16 project with exact versions and validated environments.

## Delivers
Strict TypeScript, Tailwind 4, lint/type/test/build commands, feature folders, server/client
environment schemas, safe `.env.example`, GitHub workflow skeleton and README setup.

## Blocked By
None.

## Verification Scenario
```text
GIVEN a clean checkout with documented non-secret environment values
WHEN dependencies install and npm run check plus npm run build execute
THEN all commands pass and importing a server secret into client code fails validation/build
```

## Requirements
NFR-SEC-3, NFR-TEST-1, M-4. Read stack, architecture, security.

## Acceptance Criteria
- Exact lockfile; no copied credentials; Node requirement documented.
- `npm run check` runs sequentially; placeholder test proves runner works.
- App has root error/not-found boundaries and sanitized logger foundation.

## Non-Goals
No product UI, Supabase schema or provider account setup.

