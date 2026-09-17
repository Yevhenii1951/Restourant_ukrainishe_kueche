# KLN-008 - Contact, Legal Demo and Local SEO

## Intent
Complete the public discovery surface without making false real-business claims.

## Delivers
Contact/directions/hours, consent-gated Leaflet with non-map fallback, demo Impressum,
Privacy/Terms drafts, metadata, hreflang, sitemap, robots and truthful Restaurant JSON-LD.

## Blocked By
KLN-007.

## Verification Scenario
```text
GIVEN map/analytics consent is declined
WHEN a guest opens Contact and navigates locale alternatives
THEN no optional request occurs, address/phone/directions work, and canonicals/hreflang match
```

## Requirements
FR-PUB-3..4, NFR-PRV-1, AC-7. Read legal-compliance and seo.

## Acceptance Criteria
- Demo disclosure and placeholder legal identity are unmistakable.
- No fake ratings/reviews in page or JSON-LD.
- Token/admin/checkout routes are excluded from index.

## Non-Goals
No real legal approval, Business Profile or analytics activation.

