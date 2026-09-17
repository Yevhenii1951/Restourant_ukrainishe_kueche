# Accessibility Specification

Target: WCAG 2.2 AA for public and admin critical flows.

## Global Acceptance

- One logical H1; landmarks and heading hierarchy describe the page.
- Skip link reaches main content; focus order matches visual order.
- All controls work with keyboard alone and have visible focus.
- Text contrast >= 4.5:1; large text/UI component contrast >= 3:1 where applicable.
- Text zoom at 200% and reflow at 320 CSS px do not lose content/actions.
- Touch targets meet 44 by 44 CSS px unless an allowed exception is documented.
- Errors are identified in text, associated to fields and summarized after submit.
- Live status updates use restrained `aria-live`; focus is not stolen unexpectedly.
- Locale changes update the document language. Mixed-language dish names use `lang` where useful.
- Reduced motion, high zoom and screen-reader paths remain functional.

## Menu and Cart

- Category tabs/filters use correct native semantics and expose selected state.
- Allergen abbreviations have adjacent accessible full names; tooltip is not the only source.
- Dietary icons include text. `gluten-free suitability` wording does not imply trace safety.
- Modifier groups use `fieldset`/`legend`; required counts are announced before errors.
- Quantity controls have explicit item names and do not rely on `+`/`-` alone.
- Cart total changes are announced without repeating the entire page.

## Checkout and Payment

- Checkout uses a named step/progress structure without preventing direct error correction.
- Address autocomplete, if added, never blocks manual address entry.
- Final summary precedes the payment button in DOM and visual order.
- Stripe-hosted UI/redirect is tested with keyboard and screen reader in supported mode.
- Timeouts warn users and preserve non-sensitive form/cart state.

## Reservation

- Calendar has a native/date-input fallback and does not require pointer drag.
- Disabled times explain why when possible; available times are buttons/radios with full date.
- Confirmation/cancellation status is a page state, not toast-only feedback.

## AI

- Launcher has an accessible name and does not cover sticky cart/navigation.
- Streaming content can be paused/ignored; announcements are batched to avoid screen-reader noise.
- Chat works without voice input. Focus returns to launcher after close.
- Disclaimer and contact alternative are always reachable.

## Test Gate

- axe-core passes critical pages with no serious/critical findings.
- Keyboard-only manual run covers menu -> cart -> checkout, reservation and admin action.
- Screen-reader smoke test covers errors, modifiers, totals and status changes.
- 200% zoom, 320 px reflow, reduced motion and forced-colour/high-contrast checks pass.
- Automated checks do not replace the manual checklist.

