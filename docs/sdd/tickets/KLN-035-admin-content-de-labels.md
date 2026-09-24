# KLN-035 – Admin content page: hardcode German labels (drop missing i18n namespace)

**Branch:** `feature/kln-035-admin-content-de-labels`

## Problem

All admin pages hardcode German labels. `/de/admin/inhalte` is the only one
using `getTranslations("admin.content")`, but no `admin.content` namespace
exists in `src/messages/*.json` — the page renders raw keys
(`admin.content.title`, `admin.content.intro`, `admin.content.forbidden`).

## Change

Replace the three `t(...)` lookups on `inhalte/page.tsx` with the German
hardcoded strings used across the admin area:
`Inhalte` / `Bearbeitbare Seiteninhalte – jede Publikation ist versionspflichtig.`
/ `Keine Berechtigung zum Bearbeiten von Inhalten (MANAGER oder höher).`
and drop the now-unused `getTranslations` import.

## Verification

- `npm run check` green.
- After merge: `/de/admin/inhalte` renders the German heading on prod.