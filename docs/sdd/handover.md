# Handover Ledger

Update only after evidence exists. `Planned` is not `Shipped`.

| Stage | Promised | Status | Evidence | Known delta |
| --- | --- | --- | --- | --- |
| 0 Foundation | scaffold, locale, DB/test fuse, auth/RBAC | Shipped | KLN-001–004; PR #9; merge `6670a7f` | Supabase configuration and live invite-email browser check require deployment credentials |
| 1 Catalog/content | menu, CMS, contact/legal/SEO | Planned | - | - |
| 2 Core ordering | cart, quote, pickup, order admin | Planned | - | - |
| 3 Reservations | tables, holds, guest/admin flow | Planned | - | - |
| 4 Commerce | delivery, Stripe, refund, email | Planned | - | - |
| 5 Extended | vouchers, catering, audit/dashboard | Planned | - | - |
| 6 AI | streaming read-only assistant, retention | Planned | - | - |
| 7 Hardening | consent, accessibility, CI, review | Planned | - | - |

## Stage 0 Delivery

Shipped through KLN-001–004:

- strict Next.js/TypeScript foundation, environment validation, sanitized logging and CI;
- German-first `/de`, `/en` and `/uk` shell with localized fallback and design tokens;
- isolated `kalyna_test` database fuse, repeatable SQL migrations/seeds and RLS baseline;
- invitation-only Supabase staff identity with `ADMIN`, `MANAGER` and `STAFF` roles;
- verified-email session checks, protected localized admin shell and Next.js Proxy session refresh;
- server-side role checks, database RLS/grants, last-active-admin invariant and append-only audit events;
- atomic staff mutation/audit RPCs and environment-driven first-admin bootstrap.

### KLN-004 Evidence

- Pull request: `#9` (`feature/kln-004-staff-rbac` -> `main`).
- Merge commit: `6670a7f`.
- Local and CI `npm run check`: lint and typecheck passed; 47 unit tests and 14 integration tests passed.
- `npm run build`: passed with Next.js 16.3.5; `/[locale]/admin` is dynamic and Proxy is active.
- `npm audit --omit=dev`: 0 vulnerabilities at handover time.
- Independent standards/security review: PASS.
- Independent KLN-004 specification review: PASS.

### Configuration and Operations

Required variable names are documented in `.env.example`; values remain outside Git:

- `DATABASE_URL`, `TEST_DATABASE_URL`;
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`;
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `BOOTSTRAP_ADMIN_AUTH_USER_ID`, `BOOTSTRAP_ADMIN_DISPLAY_NAME`.

Relevant commands:

```bash
npm run db:reset
npm run db:migrate
npm run db:seed
npm run db:bootstrap-admin
npm run check
npm run build
```

`db:reset`, migrations, seeds and integration tests are protected by the dedicated-test-database fuse. `db:bootstrap-admin` uses `DATABASE_URL`, validates its inputs and refuses to create another active bootstrap admin.

### Known Stage 0 Delta

- No provider credentials or test staff credentials are stored in Git.
- A live Supabase invite-email acceptance journey still requires a configured Supabase project and must be browser-tested in the deployment environment.
- No production deployment or demo URL is recorded yet.

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
