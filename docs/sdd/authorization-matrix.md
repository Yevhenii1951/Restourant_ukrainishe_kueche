# Authorization Matrix

The UI hiding a control is never authorization. Every server action/route performs
the same role check; RLS/grants provide a second boundary.

| Capability | Guest | Staff | Manager | Admin |
| --- | :---: | :---: | :---: | :---: |
| Read published public content/menu | yes | yes | yes | yes |
| Create own guest order/reservation/inquiry | token flow | yes | yes | yes |
| Read/cancel own guest record | valid public token | no broad access | no broad access | no broad access |
| View operational orders/reservations | no | yes | yes | yes |
| Change ordinary order/reservation state | no | yes | yes | yes |
| View full customer contact for active service | no | minimum needed | yes | yes |
| Export customer/order/reservation CSV | no | no | yes | yes |
| Refund online payment | no | no | no | yes |
| CRUD menu/categories/modifiers | no | no | yes | yes |
| Toggle availability | no | yes | yes | yes |
| CRUD content/events/gallery/FAQ | no | no | yes | yes |
| Manage hours, closures, tables, delivery | no | no | yes | yes |
| View dashboard aggregates | no | limited today | yes | yes |
| View audit events | no | no | no | yes |
| Invite/deactivate staff or change roles | no | no | no | yes |
| Change payment/AI/security configuration | no | no | no | yes |

## Public Token Rules

- Token contains at least 128 bits of cryptographic entropy.
- Store only a keyed hash; raw token appears only in URL/email/client session.
- Compare through a constant-time-safe server path where practical.
- Token grants access to one safe projection and permitted action, not staff APIs.
- Failed lookups use the same response shape and are rate-limited to reduce enumeration.

## Staff Session Rules

- Supabase Auth email/password or magic-link implementation must require verified email.
- Staff creation is invitation-only; first admin is created by secure seed/bootstrap process.
- Inactive staff are denied even with a valid auth session.
- Role comes from server-controlled profile/custom claims, never client metadata.
- Sensitive actions require a recent authenticated session if supported; otherwise record
  this as residual demo risk and require explicit confirmation UI.
- Admin cannot demote/deactivate the last active admin.

## Data Minimization by Role

Staff list screens show only fields needed for service. Full delivery address is visible
only for delivery orders, and only until operational completion plus configured retention.
Analytics and dashboard queries return aggregates, never raw contact data.

