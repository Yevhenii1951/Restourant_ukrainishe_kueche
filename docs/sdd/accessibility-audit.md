# Accessibility and performance audit

## Automated gate

- `npm run check` covers lint, TypeScript, unit and integration tests.
- Production build must pass before release.
- No axe runner is configured yet; do not claim an automated axe result.

## Manual release checklist

Run on a production preview at 360 px and 200% zoom:

- Tab from the skip link through header, primary actions, forms and footer.
- Confirm `:focus-visible` remains visible on every interactive control.
- Complete pickup checkout and reservation request with keyboard only.
- Confirm errors use alerts and totals/status use text, not colour alone.
- Enable reduced motion and confirm no non-essential animation remains.
- Decline map consent and confirm address, telephone, ordering and reservation work.

## Media and performance boundaries

- Gallery and dish images use `next/image`; no video is rendered on public routes.
- Leaflet is dynamically imported only after map consent.
- Public pages should be measured in a production preview before launch. No p75
  Web Vitals claim is made until real preview data is recorded.
