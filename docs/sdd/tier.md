# Tier

Tier: **Standard**

Why: local-restaurant portal with CMS/admin and public marketing pages; no
multi-tenant auth and no real payments in the MVP (cart + cash-on-pickup
checkout only). Integration tests are limited to computed behaviour
(CAS/RLS/prices/permissions). One ticket = one PR, merged by the agent after
`npm run check` is green.

Existing phase 1-2 docs (`architecture.md`, `content-model.md`,
`database-schema.md`) predate this template and stay as-is; new Standard
projects write a single `contract.md` instead.