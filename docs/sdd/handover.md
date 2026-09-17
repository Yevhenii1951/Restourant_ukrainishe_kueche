# Handover Ledger

Update only after evidence exists. `Planned` is not `Shipped`.

| Stage | Promised | Status | Evidence | Known delta |
| --- | --- | --- | --- | --- |
| 0 Foundation | scaffold, locale, DB/test fuse, auth/RBAC | Planned | - | - |
| 1 Catalog/content | menu, CMS, contact/legal/SEO | Planned | - | - |
| 2 Core ordering | cart, quote, pickup, order admin | Planned | - | - |
| 3 Reservations | tables, holds, guest/admin flow | Planned | - | - |
| 4 Commerce | delivery, Stripe, refund, email | Planned | - | - |
| 5 Extended | vouchers, catering, audit/dashboard | Planned | - | - |
| 6 AI | streaming read-only assistant, retention | Planned | - | - |
| 7 Hardening | consent, accessibility, CI, review | Planned | - | - |

## Final Handover Must Include

- repository URL, deployed demo URL and commit SHA;
- test-mode admin credentials delivered outside Git;
- environment-variable checklist without values;
- migration/seed/deployment commands;
- exact check/build/E2E output;
- requirement-to-ticket coverage report;
- unresolved security/legal/accessibility findings;
- real-launch blockers from `open-questions.md`;
- data reset, backup and recovery instructions;
- provider dashboards and secret rotation ownership.

