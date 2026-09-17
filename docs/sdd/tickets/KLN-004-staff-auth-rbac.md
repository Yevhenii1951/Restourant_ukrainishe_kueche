# KLN-004 - Staff Authentication and RBAC

## Intent
Protect the admin shell with invitation-only staff roles.

## Delivers
Staff profiles/invitations, active checks, ADMIN/MANAGER/STAFF guards, bootstrap admin
procedure, protected admin layout, denial responses, last-admin invariant and audit event.

## Blocked By
KLN-002, KLN-003.

## Verification Scenario
```text
GIVEN active STAFF, MANAGER and ADMIN sessions
WHEN each directly invokes the staff-role management action
THEN only ADMIN succeeds and the last active admin cannot be removed
```

## Requirements
FR-ADM-1, FR-ADM-2, NFR-SEC-1, AC-5.

## Acceptance Criteria
- Role is server-controlled; inactive session denied.
- RLS and server tests cover allow and deny paths.
- No demo password committed; bootstrap instructions use environment/secure action.

## Non-Goals
No customer registration or social OAuth.

