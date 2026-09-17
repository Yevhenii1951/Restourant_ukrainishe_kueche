# KLN-026 - Consent, Analytics and Browser Security

## Intent
Enable optional analytics/maps only under truthful consent and tighten browser boundaries.

## Delivers
Granular versioned preferences, Plausible adapter disabled by default until configured,
Leaflet tile gating, CSP/security/referrer/permissions headers and token-page isolation.

## Blocked By
KLN-008, KLN-025.

## Verification Scenario
```text
GIVEN optional consent is declined
WHEN public, map and token pages load
THEN no analytics/tile request occurs, contact still works, and token never reaches referrer/third party
```

## Requirements
NFR-SEC-2, NFR-PRV-1, AC-7. Read security and legal-compliance.

## Acceptance Criteria
- Accept/reject/customize/revoke are equally reachable.
- CSP permits only implemented providers and does not require unsafe wildcard.
- Privacy inventory exactly matches network behavior.

## Non-Goals
No fingerprinting, ad pixels or assumption that provider branding equals compliance.

