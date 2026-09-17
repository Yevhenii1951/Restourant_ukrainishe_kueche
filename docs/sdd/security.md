# Security Specification

## Protected Assets

- Customer identity/contact/address and notes.
- Staff identities, roles and sessions.
- Order, reservation, payment and voucher integrity.
- Stripe, Supabase, email, AI and cron secrets.
- Public access and cancellation tokens.
- Audit trail and operational availability.

## Main Threats and Controls

| Threat | Required control | Verification |
| --- | --- | --- |
| Client price manipulation | server catalog lookup and recalculation | integration test with forged cents |
| IDOR on order/reservation | opaque scoped token or staff authorization | foreign-token API tests |
| Role escalation | server role source + RLS + last-admin guard | matrix integration tests |
| Duplicate order/payment | idempotency keys and unique provider events | replay/concurrency tests |
| Double table allocation | DB exclusion/transaction locking | concurrent DB test |
| Forged Stripe webhook | raw-body signature verification | invalid signature test |
| Stored XSS in CMS | typed blocks, allowlist sanitization, CSP | malicious content test |
| Upload abuse | MIME/size/decode validation, generated paths | invalid/polyglot tests |
| Token enumeration | entropy, hash storage, uniform errors, rate limit | API response test |
| AI prompt/tool abuse | allowlisted read tools, bounded DTOs, no secrets | adversarial prompt tests |
| PII leakage | structured redaction and no sensitive logs | logger unit/integration test |
| CSRF | same-site sessions, origin check, framework protections | cross-origin mutation test |

## Mandatory Headers

- Content Security Policy compatible with Stripe and explicitly chosen analytics/maps.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin` or stricter on token pages.
- `Permissions-Policy` disabling unused sensors/camera/microphone/geolocation.
- HSTS in production after HTTPS/domain readiness.
- Public token pages use `noindex`, `no-store`, and never leak token via third-party requests.

## Secret Handling

- `.env.local` and provider secrets are never committed or copied from Oma Netz.
- Browser receives only publishable Supabase/Stripe identifiers intended for exposure.
- Supabase secret key, Stripe secret/webhook, Brevo, AI and cron secrets are server-only.
- `.env.example` contains names and safe descriptions, never credential-shaped examples.
- Rotate immediately after suspected exposure and document incident, without writing secret values.

## Validation

- Zod validates body, query, path and tool inputs at the boundary.
- Normalize email, telephone and PLZ once; preserve display form only when needed.
- Enforce database constraints independently of application validation.
- Notes/messages have explicit length limits and render as text unless sanitized.
- Never construct SQL, sort columns or storage paths from unvalidated user strings.

## Dependency and Build Controls

- Lockfile committed; automated dependency review and `npm audit` inspected before release.
- GitHub Actions run install with lockfile, lint, types, unit/integration tests and build.
- Production source maps and error reporting must not expose secrets/PII.
- Preview deployments use test/sandbox provider modes only.

## Release Security Gate

- All matrix deny tests pass.
- RLS/grant tests pass against the dedicated test database.
- Stripe signature/replay/amount mismatch tests pass.
- Concurrency tests pass for order idempotency, vouchers and table allocation.
- CSP works on checkout, AI and consented map/analytics flows.
- No high/critical dependency or manual review finding remains unexplained.
- A manual check confirms no real secret appears in Git history or build output.

