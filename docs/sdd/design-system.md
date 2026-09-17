# Design Direction

## Concept

Traditional Ukrainian hospitality presented with contemporary restraint. The interface
should feel warm, crafted and culturally specific, not like a generic SaaS dashboard or
a page covered in flag colours.

## Visual Language

- Base: warm linen/off-white surfaces and deep ink text.
- Primary: dark kalyna red; secondary: muted wheat/gold; accent: restrained blue.
- Ukrainian ornament appears as a sparse border/divider pattern, not behind body text.
- Food photography is dominant on marketing/menu surfaces; admin is calmer and denser.
- Light public sections with optional deep evening sections; admin supports a dark shell
  only if contrast and form controls remain consistent. No user theme toggle is required.

Exact colour values are design tokens selected during the design ticket and verified for
contrast. Do not hardcode colours inside components.

## Typography

- Self-hosted variable fonts supporting Latin and Cyrillic.
- Display face may carry a traditional editorial character; body face prioritizes legibility.
- Minimum body size 16 px; long-form line length roughly 60-75 characters.
- Avoid script fonts for navigation, prices, forms or Ukrainian body copy.

## Component Principles

- Buttons have one primary action per region; destructive actions are never visually primary.
- Dish cards prioritize name, description, portion, total price, dietary flags and allergens.
- Cart is a full route on mobile; desktop may additionally use a sheet.
- Modifiers use fieldsets/legends and expose selection rules before validation.
- Status badges pair text and icon; never colour alone.
- Forms keep labels visible, errors adjacent and summaries linked to invalid fields.
- Toasts supplement, never replace, persistent success/error state.
- Dialogs are reserved for focused confirmation, not multi-step checkout.

## Responsive Behaviour

- Start at 360 px. No horizontal scroll at 320 px except legitimate data tables with
  an accessible alternative/card presentation.
- Public mobile navigation exposes Menu, Order, Reserve and Call quickly.
- Sticky mobile cart bar appears only when cart has items and does not cover content.
- Admin order/reservation actions remain usable on a phone during service.
- Touch targets are at least 44 by 44 CSS pixels.

## Motion

- CSS transitions and IntersectionObserver only; no Framer Motion dependency.
- Motion duration stays brief and never blocks interaction.
- `prefers-reduced-motion: reduce` removes parallax, auto-animation and smooth scrolling.
- No autoplay audio. Video hero, if retained, is muted, pauseable and has a static poster.

## Asset Direction

Use the existing `public/` images only after asset register review. Prefer WebP/AVIF
derivatives through `next/image`; preserve originals until license provenance is known.
`ukrainian-kitchen-logo.png` is the starting brand asset, not automatically final artwork.

