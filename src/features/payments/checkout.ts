import type { Pool } from "pg";
import type { Cart, CartIssue } from "@/features/cart/domain";
import { estimateLineTotalCents, validateCart } from "@/features/cart/domain";
import type { PublicMenu, SupportedLocale } from "@/features/menu/domain";
import { PRIVACY_VERSION, derivePublicOrderToken, sha256Hex } from "@/features/order/domain";
import { getSlotsFromStore, type DatabaseRunner } from "@/features/quote/slotsService";
import type { Promo, QuoteBreakdown } from "@/features/quote/domain";
import { calculateQuote, hashQuotePayload, normalizeGermanPlz, verifyQuote } from "@/features/quote/domain";
import { promoWindowOpen, type QuoteStore } from "@/features/quote/store";
import { createStripeCheckoutSchema, type CreateStripeCheckoutInput } from "./domain";
import type { StripeCheckoutClient } from "./stripeClient";

export type StripeCheckoutResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "needs-attention"; cartIssues: CartIssue[] }
  | { status: "conflict" }
  | { status: "checkout"; redirectUrl: string; token: string; replayed: boolean }
  | {
      status: "rejected";
      reason: "input" | "quote-invalid" | "quote-stale" | "privacy-not-accepted" |
        "minimum-not-met" | "promo-minimum-not-met" | "promo-invalid" |
        "zone-not-eligible" | "slot-unavailable" | "pickup-paused" | "paypal-unavailable";
      minimumCents?: number;
      subtotalCents?: number;
    };

export interface StripeCheckoutDeps {
  baseUrl: string;
  loadMenu: (locale: SupportedLocale) => Promise<PublicMenu>;
  now?: Date;
  paypalEnabled: boolean;
  pool: DatabaseRunner & Pick<Pool, "query">;
  secret: string;
  store: QuoteStore;
  stripe: StripeCheckoutClient;
}

interface ExistingOrderRow {
  id: string;
  order_number: string;
  request_hash: string;
}

interface ExistingPaymentRow {
  provider_checkout_url: string;
}

function buildItemRows(cart: Cart, menu: PublicMenu): unknown[] {
  const itemsById = new Map(menu.items.map((item) => [item.id, item]));
  return cart.lines.map((line) => {
    const item = itemsById.get(line.menuItemId)!;
    return {
      name: item.name,
      basePriceCents: item.basePriceCents,
      lineTotalCents: estimateLineTotalCents(item, line),
      quantity: line.quantity,
      allergens: item.allergens.map((allergen) => allergen.code),
      modifiers: line.modifierSelections.flatMap((selection) => {
        const group = item.modifierGroups.find((candidate) => candidate.id === selection.groupId);
        if (!group) return [];
        return [...new Set(selection.optionIds)].flatMap((optionId) => {
          const option = group.options.find((candidate) => candidate.id === optionId);
          return option ? [{ groupName: group.name, optionName: option.name, deltaCents: option.priceDeltaCents }] : [];
        });
      }),
    };
  });
}

function checkoutUrl(baseUrl: string, locale: string, token: string, suffix: string): string {
  const url = new URL(`/${locale}/bestellung/${encodeURIComponent(token)}${suffix}`, baseUrl);
  return url.toString();
}

async function loadPromo(input: CreateStripeCheckoutInput, deps: StripeCheckoutDeps, now: Date): Promise<Promo | null> {
  const promoCode = input.promoCode?.trim().toUpperCase() || null;
  if (!promoCode) return null;
  const row = await deps.store.getPromoByCodeLookup(promoCode);
  if (!row || !promoWindowOpen(row, now.getTime())) return null;
  return { mode: row.mode, value: row.value, minimumSubtotalCents: row.minimumSubtotalCents };
}

async function validateSlot(input: CreateStripeCheckoutInput, deps: StripeCheckoutDeps, now: Date, plz: string | null): Promise<boolean> {
  const [slotDate] = input.slotStartUtc.split("T");
  const slots = await getSlotsFromStore({ fulfilment: input.fulfilment, plz, date: slotDate }, now, deps);
  if (slots.status !== "slots") return false;
  const chosen = slots.slots.find((slot) => slot.startUtc === input.slotStartUtc);
  return Boolean(chosen && chosen.remainingCapacity > 0);
}

async function existingCheckoutUrl(pool: StripeCheckoutDeps["pool"], orderId: string): Promise<string | null> {
  const result = await pool.query<ExistingPaymentRow>(
    "SELECT provider_checkout_url FROM payments WHERE order_id = $1 AND state = 'checkout_created'",
    [orderId],
  );
  return result.rows[0]?.provider_checkout_url ?? null;
}

async function markPaymentFailed(pool: StripeCheckoutDeps["pool"], orderId: string): Promise<void> {
  await pool.query("UPDATE orders SET state = 'payment_failed' WHERE id = $1 AND state = 'awaiting_payment'", [orderId]);
  await pool.query(
    "INSERT INTO order_status_events (order_id, from_state, to_state, reason) VALUES ($1, 'awaiting_payment', 'payment_failed', 'stripe_checkout_unavailable')",
    [orderId],
  );
}

export async function createStripeCheckoutOrder(
  raw: unknown,
  locale: SupportedLocale,
  deps: StripeCheckoutDeps,
): Promise<StripeCheckoutResult> {
  const parsed = createStripeCheckoutSchema.safeParse(raw);
  if (!parsed.success) return { status: "rejected", reason: "input" };
  const input = parsed.data;
  if (input.paymentMethod === "stripe_paypal" && !deps.paypalEnabled) return { status: "rejected", reason: "paypal-unavailable" };
  if (!input.contact.privacyAccepted) return { status: "rejected", reason: "privacy-not-accepted" };

  const now = deps.now ?? new Date();
  const plz = input.fulfilment === "delivery" ? normalizeGermanPlz(input.plz ?? "") : null;
  if (input.fulfilment === "delivery" && (!plz || plz !== input.deliveryAddress?.postalCode)) {
    return { status: "rejected", reason: "zone-not-eligible" };
  }
  const promoCode = input.promoCode?.trim().toUpperCase() || null;
  const claim = verifyQuote(input.quoteToken, deps.secret, now.getTime());
  if (!claim) return { status: "rejected", reason: "quote-invalid" };
  const payloadHash = hashQuotePayload({ cart: input.cart, fulfilment: input.fulfilment, plz, promoCode, tipCents: input.tipCents ?? 0, slotStartUtc: input.slotStartUtc });
  if (claim.payloadHash !== payloadHash) return { status: "rejected", reason: "quote-stale" };

  const settings = await deps.store.getCommerceSettings();
  if (!settings) return { status: "error", reason: "service-unavailable" };
  const menu = await deps.loadMenu(locale);
  const itemsById = new Map(menu.items.map((item) => [item.id, item]));
  const cartIssues = validateCart(input.cart, itemsById);
  for (const line of input.cart.lines) {
    if (line.quantity > settings.maxLineQuantity) cartIssues.push({ lineIndex: input.cart.lines.indexOf(line), kind: "invalid-quantity", actual: line.quantity });
  }
  if (cartIssues.length > 0) return { status: "needs-attention", cartIssues };

  const subtotalCents = input.cart.lines.reduce((sum, line) => sum + estimateLineTotalCents(itemsById.get(line.menuItemId)!, line), 0);
  const zone = plz ? await deps.store.getDeliveryZoneByPlz(plz) : null;
  const quote = calculateQuote({ fulfilment: input.fulfilment, plz, zone, promoCode, promo: await loadPromo(input, deps, now), subtotalCents, tipCents: input.tipCents ?? 0, settings });
  if (!quote.ok) return { status: "rejected", reason: quote.reason, minimumCents: quote.minimumCents, subtotalCents: quote.subtotalCents };
  if (!(await validateSlot(input, deps, now, plz))) return { status: "rejected", reason: "slot-unavailable" };

  return insertAndBindCheckout(input, locale, plz, promoCode, quote.breakdown, menu, deps);
}

async function insertAndBindCheckout(
  input: CreateStripeCheckoutInput,
  locale: SupportedLocale,
  plz: string | null,
  promoCode: string | null,
  breakdown: QuoteBreakdown,
  menu: PublicMenu,
  deps: StripeCheckoutDeps,
): Promise<StripeCheckoutResult> {
  const requestHash = hashQuotePayload({ cart: input.cart, fulfilment: input.fulfilment, plz, promoCode, tipCents: input.tipCents ?? 0, slotStartUtc: input.slotStartUtc, paymentMethod: "stripe_checkout", contact: { guestName: input.contact.guestName, guestPhone: input.contact.guestPhone, privacyVersion: PRIVACY_VERSION }, deliveryAddress: input.deliveryAddress ?? null });
  const publicToken = derivePublicOrderToken(deps.secret, input.idempotencyKey);
  const idempotencyHash = sha256Hex(input.idempotencyKey);
  let order: ExistingOrderRow;
  try {
    const inserted = await deps.pool.query<{ insert_stripe_checkout_order: string }>(
      "SELECT insert_stripe_checkout_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)",
      [sha256Hex(publicToken), idempotencyHash, requestHash, input.fulfilment, input.slotStartUtc, input.contact.guestName, input.contact.guestPhone, PRIVACY_VERSION, breakdown.subtotalCents, promoCode, breakdown.promoDiscountCents, breakdown.deliveryFeeCents, breakdown.tipCents, breakdown.totalCents, JSON.stringify(buildItemRows(input.cart, menu)), input.deliveryAddress?.street ?? null, input.deliveryAddress?.houseNumber ?? null, plz, input.deliveryAddress?.city ?? null, input.deliveryAddress?.deliveryNote ?? null],
    );
    const id = inserted.rows[0].insert_stripe_checkout_order;
    const row = await deps.pool.query<ExistingOrderRow>("SELECT id, order_number, request_hash FROM orders WHERE id = $1", [id]);
    order = row.rows[0];
  } catch (error) {
    const pgError = error as { code?: unknown; message?: unknown };
    if (typeof pgError.message === "string" && pgError.message.includes("slot is full")) return { status: "rejected", reason: "slot-unavailable" };
    if (pgError.code !== "23505") throw error;
    const existing = await deps.pool.query<ExistingOrderRow>("SELECT id, order_number, request_hash FROM orders WHERE idempotency_hash = $1", [idempotencyHash]);
    order = existing.rows[0];
    if (!order || order.request_hash !== requestHash) return { status: "conflict" };
    const url = await existingCheckoutUrl(deps.pool, order.id);
    if (url) return { status: "checkout", redirectUrl: url, token: publicToken, replayed: true };
  }

  try {
    const session = await deps.stripe.createCheckoutSession({
      amountCents: breakdown.totalCents,
      cancelUrl: new URL(`/${locale}/bestellen`, deps.baseUrl).toString(),
      currency: "EUR",
      locale,
      orderId: order.id,
      orderNumber: Number(order.order_number),
      paymentMethod: input.paymentMethod,
      successUrl: checkoutUrl(deps.baseUrl, locale, publicToken, "?stripe=return"),
    });
    await deps.pool.query("SELECT bind_stripe_checkout_payment($1,$2,$3,$4,$5)", [order.id, session.id, session.url, breakdown.totalCents, "EUR"]);
    return { status: "checkout", redirectUrl: session.url, token: publicToken, replayed: false };
  } catch {
    await markPaymentFailed(deps.pool, order.id);
    return { status: "error", reason: "service-unavailable" };
  }
}
