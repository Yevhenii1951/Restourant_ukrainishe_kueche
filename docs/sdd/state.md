# State — session handover

Written: 2026-09-19 (KLN-011 pickup checkout)

## Done

- KLN-001..010 shipped and merged (PR #1, #10, #11, #12, #13, #14, #15).
- KLN-011 (guest pickup + public order) implemented on
  `feature/kln-011-pickup-checkout`: `npm run check` green (141 unit + 55
  integration incl. 11 new `kln011-orders`), lint + tsc + build ok.
  Delivers: migration `0008_orders.sql` (`order_state` enum, `orders`/
  `order_items`/`order_item_modifiers`/`order_status_events`, RLS + grants,
  capacity-checked `insert_pickup_order`, `cancel_pending_order` transition
  guard); pure `src/features/order/domain.ts` + `quote/slotsService.ts`
  (capacity counting via injected pool); server-authoritative
  `createPickupOrder`/`getPublicOrder`/`cancelPublicOrder`; checkout form +
  public status/cancel page at `/[locale]/bestellung/[token]`.
  Token/contact safety: raw public token returned once, stored as sha256;
  safe projection never selects guest name/phone; cancel nulls contact.
  Idempotency: `idempotency_hash` + `request_hash` (same key+payload → replay
  with same deterministic token; same key+different payload → conflict).

## Current

- Branch `feature/kln-011-pickup-checkout` @ `b1db722`, pushed? (see PR).
- Browser checkout scenario not runnable locally (no `.env.local` → runtime
  fail-closed, same as KLN-008/009).

## Next

- KLN-012 (admin order queue), then KLN-013..015 (reservations) per
  `implementation-plan.md`.
  Branch: `feature/kln-012-…`.

## Branch / env

- Branch: `feature/kln-011-pickup-checkout` → PR to `main`. Next:
  `feature/kln-012-…`.
- Env: no `.env.local` → runtime fail-closed; admin redirects locally
  (expected). `.env.test.local` exists for tests. Server env keys:
  `QUOTE_SIGNING_SECRET` (≥32 chars), `DATABASE_URL` (order runtime pool).
- `gh` v2.101.0 installed at `~/.local/bin/gh`; agent opens and merges PRs.
