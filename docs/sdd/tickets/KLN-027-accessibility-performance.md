# KLN-027 - Accessibility and Performance Remediation

## Intent
Measure and fix the complete product against its non-functional targets.

## Delivers
axe coverage, manual keyboard/screen-reader checklist evidence, zoom/reflow/reduced-motion
fixes, image/font/code loading optimization and production-preview Web Vitals report.

## Blocked By
KLN-026.

## Verification Scenario
```text
GIVEN a 360 px viewport, 200% zoom, keyboard-only input and reduced motion
WHEN BS-1, BS-4 and core admin action run
THEN no content/action is lost and errors, totals, focus and status remain perceivable
```

## Requirements
NFR-A11Y-1, NFR-PERF-1, UX-1..6, M-2, M-5.

## Acceptance Criteria
- No serious/critical axe findings; manual gaps recorded and fixed.
- Measured p75 targets met or honest residual risk documented.
- Optional video never harms LCP/data/motion experience.

## Non-Goals
No visual redesign unrelated to measured failure or screenshot-test suite.

