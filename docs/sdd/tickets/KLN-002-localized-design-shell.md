# KLN-002 - Localized Accessible Design Shell

## Intent
Deliver the branded responsive shell shared by public pages.

## Delivers
DE/EN/UK routing, German fallback, header/footer/mobile actions, self-hosted font setup,
design tokens, skip link, focus/reduced-motion behavior and placeholder Home route.

## Blocked By
KLN-001.

## Verification Scenario
```text
GIVEN Ukrainian locale with one missing translated message and reduced motion enabled
WHEN the public shell renders at 360 px and is navigated by keyboard
THEN German fallback appears, no horizontal scroll/motion occurs, and focus reaches main
```

## Requirements
FR-PUB-1..4, NFR-A11Y-1, NFR-I18N-1, UX-1, UX-4, UX-5.

## Acceptance Criteria
- `/` locale negotiation is deterministic and loop-free.
- Logo candidate used accessibly; demo disclosure visible in footer.
- No Framer Motion and no hardcoded brand colours in JSX.

## Non-Goals
No final marketing content, CMS or dark-mode toggle.

