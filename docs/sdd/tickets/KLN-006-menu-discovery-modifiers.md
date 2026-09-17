# KLN-006 - Menu Search, Filters and Modifiers

## Intent
Let guests find suitable dishes and understand valid modifier selections.

## Delivers
Localized search, category/dietary filters, explicit gluten-free suitability, modifier groups,
German fallback and accessible selection preview without cart persistence.

## Blocked By
KLN-005.

## Verification Scenario
```text
GIVEN a Ukrainian dish missing Ukrainian description with one required 1-of-2 modifier
WHEN a guest filters, opens it and selects no or two options
THEN German description falls back and invalid counts are explained before addition
```

## Requirements
FR-PUB-2, FR-MENU-2, FR-MENU-4, NFR-A11Y-1, AC-6.

## Acceptance Criteria
- Search/filter URL state is shareable but noindex where appropriate.
- Modifier min/max enforced by shared schema and server-ready DTO.
- Allergen and dietary semantics remain distinct.

## Non-Goals
No cart, fuzzy AI search or inferred gluten-free claim.

