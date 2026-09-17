# Features

Feature-based colocation (per `docs/sdd/architecture.md`). Modules are created as
their tickets land; this page documents the planned boundaries so implementers
place code consistently.

| Module | Owns |
| --- | --- |
| `catalog` | categories, dishes, modifiers, allergens |
| `cart` | browser cart representation, revalidation input |
| `ordering` | quote, order snapshots, transitions, public access |
| `payments` | checkout sessions, webhooks, refunds |
| `delivery` | PLZ zones, fees, service windows |
| `reservations` | tables, allocation, holds, transitions |
| `content` | typed localized pages and media |
| `identity` | staff profiles, roles, invitations |
| `notifications` | templates, outbox, retries |
| `assistant` | read-only tools, messages, retention |
| `admin` | admin shell, dashboards, audit usage |

Rules: no barrel exports, no `any`, files under 200 lines, components under 150 lines.