# KLN-005 - Structured Public Menu

## Intent
Publish a database-backed localized menu with canonical allergen information.

## Delivers
Catalog/reference migrations, deterministic seed dishes, safe public view/query, categories,
dish cards, availability/publication states, allergen/additive legend and image usage.

## Blocked By
KLN-002, KLN-003.

## Verification Scenario
```text
GIVEN one published available dish, one draft and one archived dish
WHEN an anonymous guest opens the German menu
THEN only the published dish appears with price, portion and full allergen labels
```

## Requirements
FR-MENU-1, FR-MENU-3, NFR-SEC-1, UX-1.

## Acceptance Criteria
- German fields/allergen review required for publication.
- Anon can read safe view only, never catalog tables or draft content.
- Asset license remains marked unverified; images have meaningful alt.

## Non-Goals
No admin editing, search, cart or allergy guarantee.

