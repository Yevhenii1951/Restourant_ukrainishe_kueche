# KLN-007 - Typed CMS and Marketing Pages

## Intent
Allow managers to edit requested public content without a generic block editor.

## Delivers
Versioned typed forms and public routes for Home, About, FAQ, Lunch, Events, Gallery and
Catering introduction; publication/preview, German fallback, sanitization and cache invalidation.

## Blocked By
KLN-004, KLN-005.

## Verification Scenario
```text
GIVEN MANAGER edits German Home hero and leaves Ukrainian hero empty
WHEN the version is published
THEN German Home shows the edit, Ukrainian Home shows German fallback, and STAFF is forbidden
```

## Requirements
FR-PUB-2, FR-PUB-3, FR-PUB-5, FR-ADM-5, AC-5, AC-6.

## Acceptance Criteria
- Optimistic version rejects stale overwrite.
- Typed/sanitized content only; archive instead of destructive delete.
- Preview is protected and noindex.

## Non-Goals
No legal final copy, arbitrary HTML or page-builder blocks.

