import {
  createOrderSchema,
  createDeliveryOrderSchema,
  derivePublicOrderToken,
  PRIVACY_VERSION,
  sha256Hex,
  type CreateDeliveryOrderInput,
  type CancelProjection,
  type OrderProjection,
  type OrderState,
} from "./domain";
import { validateCart, estimateLineTotalCents, type CartIssue } from "@/features/cart/domain";
import type { Cart } from "@/features/cart/domain";
import {
  calculateQuote,
  hashQuotePayload,
  normalizeGermanPlz,
  verifyQuote,
  type Promo,
  type QuoteBreakdown,
} from "@/features/quote/domain";
import { getSlotsFromStore, type DatabaseRunner } from "@/features/quote/slotsService";
import { promoWindowOpen, type QuoteStore } from "@/features/quote/store";
import type { PublicMenu, SupportedLocale } from "@/features/menu/domain";

export type OrderResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "needs-attention"; cartIssues: CartIssue[] }
  | {
      status: "rejected";
      reason:
        | "input"
        | "quote-invalid"
        | "quote-stale"
        | "privacy-not-accepted"
        | "minimum-not-met"
        | "promo-minimum-not-met"
        | "promo-invalid"
        | "zone-not-eligible"
        | "slot-unavailable"
        | "pickup-paused";
      minimumCents?: number;
      subtotalCents?: number;
    }
  | { status: "conflict" }
  | { status: "created"; order: OrderProjection; token: string; replayed: boolean };

export interface OrderServiceDeps {
  pool: DatabaseRunner;
  secret: string;
  now?: Date;
  store: QuoteStore;
  loadMenu: (locale: SupportedLocale) => Promise<PublicMenu>;
}

interface OrderRow {
  id: string;
  order_number: string;
  state: OrderState;
  scheduled_for: Date | string;
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  tip_cents: number;
  total_cents: number;
}

interface ItemRow {
  id: string;
  name_snapshot: string;
  line_total_cents: number;
  quantity: number;
}

interface ModifierRow {
  order_item_id: string;
  group_name_snapshot: string;
  option_name_snapshot: string;
  delta_cents: number;
}

async function fetchOrderProjection(
  pool: DatabaseRunner,
  orderId: string,
): Promise<OrderProjection> {
  const order = await pool.query<OrderRow>(
    `SELECT id, order_number, state, scheduled_for, subtotal_cents, discount_cents,
            delivery_fee_cents, tip_cents, total_cents
     FROM orders WHERE id = $1`,
    [orderId],
  );
  const row = order.rows[0];
  const scheduledFor =
    row.scheduled_for instanceof Date ? row.scheduled_for.toISOString() : String(row.scheduled_for);

  const [items, modifiers] = await Promise.all([
    pool.query<ItemRow>(
      `SELECT id, name_snapshot, line_total_cents, quantity
       FROM order_items WHERE order_id = $1 ORDER BY id`,
      [orderId],
    ),
    pool.query<ModifierRow>(
      `SELECT om.order_item_id, om.group_name_snapshot, om.option_name_snapshot, om.delta_cents
       FROM order_item_modifiers om
       WHERE om.order_item_id = ANY(
         SELECT id FROM order_items WHERE order_id = $1
       ) ORDER BY om.id`,
      [orderId],
    ),
  ]);

  const modifiersByItem = new Map<string, OrderProjection["lines"][number]["modifiers"]>();
  for (const mod of modifiers.rows) {
    const key = mod.order_item_id;
    const list = modifiersByItem.get(key) ?? [];
    list.push({ groupName: mod.group_name_snapshot, optionName: mod.option_name_snapshot, deltaCents: mod.delta_cents });
    modifiersByItem.set(key, list);
  }

  return {
    orderNumber: Number(row.order_number),
    state: row.state,
    scheduledFor,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    tipCents: row.tip_cents,
    totalCents: row.total_cents,
    lines: items.rows.map((item) => ({
      name: item.name_snapshot,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
      modifiers: modifiersByItem.get(item.id) ?? [],
    })),
  };
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
          return option
            ? [{ groupName: group.name, optionName: option.name, deltaCents: option.priceDeltaCents }]
            : [];
        });
      }),
    };
  });
}

export async function createPickupOrder(
  input: unknown,
  locale: SupportedLocale,
  deps: OrderServiceDeps,
): Promise<OrderResult> {
  const { pool, secret, store, loadMenu } = deps;
  if (!pool || !secret || !store || !loadMenu) {
    return { status: "error", reason: "service-unavailable" };
  }
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { status: "rejected", reason: "input" };

  const order = parsed.data;
  const now = deps.now ?? new Date();
  if (!order.contact.privacyAccepted) {
    return { status: "rejected", reason: "privacy-not-accepted" };
  }
  const promoCode = order.promoCode?.trim().toUpperCase() || null;

  const claim = verifyQuote(order.quoteToken, secret, now.getTime());
  if (!claim) return { status: "rejected", reason: "quote-invalid" };

  const payloadHash = hashQuotePayload({
    cart: order.cart,
    fulfilment: "pickup",
    plz: null,
    promoCode,
    tipCents: order.tipCents ?? 0,
    slotStartUtc: order.slotStartUtc,
  });
  if (claim.payloadHash !== payloadHash) return { status: "rejected", reason: "quote-stale" };

  const settings = await store.getCommerceSettings();
  if (!settings) return { status: "error", reason: "service-unavailable" };

  const menu = await loadMenu(locale);
  const itemsById = new Map(menu.items.map((item) => [item.id, item]));
  const cartIssues = validateCart(order.cart, itemsById);
  for (const line of order.cart.lines) {
    if (line.quantity > settings.maxLineQuantity) {
      cartIssues.push({
        lineIndex: order.cart.lines.indexOf(line),
        kind: "invalid-quantity",
        actual: line.quantity,
      });
    }
  }
  if (cartIssues.length > 0) return { status: "needs-attention", cartIssues };

  const subtotalCents = order.cart.lines.reduce(
    (sum, line) => sum + estimateLineTotalCents(itemsById.get(line.menuItemId)!, line),
    0,
  );

  let promo: Promo | null = null;
  if (promoCode) {
    const promoRow = await store.getPromoByCodeLookup(promoCode);
    if (promoRow && promoWindowOpen(promoRow, now.getTime())) {
      promo = { mode: promoRow.mode, value: promoRow.value, minimumSubtotalCents: promoRow.minimumSubtotalCents };
    }
  }

  const quote = calculateQuote({
    fulfilment: "pickup",
    plz: null,
    zone: null,
    promoCode,
    promo,
    subtotalCents,
    tipCents: order.tipCents ?? 0,
    settings,
  });
  if (!quote.ok) {
    return {
      status: "rejected",
      reason: quote.reason,
      minimumCents: quote.minimumCents,
      subtotalCents: quote.subtotalCents,
    };
  }
  const breakdown: QuoteBreakdown = quote.breakdown;

  const [slotDate] = order.slotStartUtc.split("T");
  const slotsResult = await getSlotsFromStore(
    { fulfilment: "pickup", date: slotDate },
    now,
    { store, pool },
  );
  if (slotsResult.status !== "slots") return { status: "rejected", reason: "slot-unavailable" };
  const chosen = slotsResult.slots.find((slot) => slot.startUtc === order.slotStartUtc);
  if (!chosen || chosen.remainingCapacity < 1) return { status: "rejected", reason: "slot-unavailable" };

  const requestHash = hashQuotePayload({
    cart: order.cart,
    fulfilment: "pickup",
    plz: null,
    promoCode,
    tipCents: order.tipCents ?? 0,
    slotStartUtc: order.slotStartUtc,
    paymentMethod: "cash_pickup",
    contact: {
      guestName: order.contact.guestName,
      guestPhone: order.contact.guestPhone,
      privacyVersion: PRIVACY_VERSION,
    },
  });

  const idempotencyHash = sha256Hex(order.idempotencyKey);
  const publicToken = derivePublicOrderToken(secret, order.idempotencyKey);
  const publicTokenHash = sha256Hex(publicToken);
  const itemRows = buildItemRows(order.cart, menu);

  let orderId: string;
  try {
    const inserted = await pool.query<{ insert_pickup_order: string }>(
      `SELECT insert_pickup_order($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        publicTokenHash,
        idempotencyHash,
        requestHash,
        order.slotStartUtc,
        order.contact.guestName,
        order.contact.guestPhone,
        PRIVACY_VERSION,
        breakdown.subtotalCents,
        promoCode,
        breakdown.promoDiscountCents,
        breakdown.tipCents,
        breakdown.totalCents,
        JSON.stringify(itemRows),
      ],
    );
    orderId = inserted.rows[0].insert_pickup_order;
  } catch (error) {
    const pgError = error as { code?: unknown; message?: unknown };
    if (typeof pgError.message === "string" && pgError.message.includes("slot is full")) {
      return { status: "rejected", reason: "slot-unavailable" };
    }
    if (typeof pgError.message === "string" && pgError.message.includes("pickup orders are paused")) {
      return { status: "rejected", reason: "pickup-paused" };
    }
    if (pgError.code !== "23505") throw error;
    const existing = await pool.query<{ id: string; request_hash: string }>(
      "SELECT id, request_hash FROM orders WHERE idempotency_hash = $1",
      [idempotencyHash],
    );
    if (existing.rows.length > 0 && existing.rows[0].request_hash === requestHash) {
      return {
        status: "created",
        order: await fetchOrderProjection(pool, existing.rows[0].id),
        token: publicToken,
        replayed: true,
      };
    }
    return { status: "conflict" };
  }

  return {
    status: "created",
    order: await fetchOrderProjection(pool, orderId),
    token: publicToken,
    replayed: false,
  };
}

export async function createDeliveryOrder(
  input: unknown,
  locale: SupportedLocale,
  deps: OrderServiceDeps,
): Promise<OrderResult> {
  const { pool, secret, store, loadMenu } = deps;
  if (!pool || !secret || !store || !loadMenu) return { status: "error", reason: "service-unavailable" };
  const parsed = createDeliveryOrderSchema.safeParse(input);
  if (!parsed.success) return { status: "rejected", reason: "input" };
  const order: CreateDeliveryOrderInput = parsed.data;
  const now = deps.now ?? new Date();
  if (!order.contact.privacyAccepted) return { status: "rejected", reason: "privacy-not-accepted" };

  const plz = normalizeGermanPlz(order.plz);
  if (!plz || plz !== order.deliveryAddress.postalCode) {
    return { status: "rejected", reason: "zone-not-eligible" };
  }
  const promoCode = order.promoCode?.trim().toUpperCase() || null;
  const claim = verifyQuote(order.quoteToken, secret, now.getTime());
  if (!claim) return { status: "rejected", reason: "quote-invalid" };
  const payloadHash = hashQuotePayload({
    cart: order.cart,
    fulfilment: "delivery",
    plz,
    promoCode,
    tipCents: order.tipCents ?? 0,
    slotStartUtc: order.slotStartUtc,
  });
  if (claim.payloadHash !== payloadHash) return { status: "rejected", reason: "quote-stale" };

  const settings = await store.getCommerceSettings();
  if (!settings) return { status: "error", reason: "service-unavailable" };
  const menu = await loadMenu(locale);
  const itemsById = new Map(menu.items.map((item) => [item.id, item]));
  const cartIssues = validateCart(order.cart, itemsById);
  for (const line of order.cart.lines) {
    if (line.quantity > settings.maxLineQuantity) cartIssues.push({ lineIndex: order.cart.lines.indexOf(line), kind: "invalid-quantity", actual: line.quantity });
  }
  if (cartIssues.length > 0) return { status: "needs-attention", cartIssues };

  const subtotalCents = order.cart.lines.reduce((sum, line) => sum + estimateLineTotalCents(itemsById.get(line.menuItemId)!, line), 0);
  const zone = await store.getDeliveryZoneByPlz(plz);
  let promo: Promo | null = null;
  if (promoCode) {
    const promoRow = await store.getPromoByCodeLookup(promoCode);
    if (promoRow && promoWindowOpen(promoRow, now.getTime())) promo = { mode: promoRow.mode, value: promoRow.value, minimumSubtotalCents: promoRow.minimumSubtotalCents };
  }
  const quote = calculateQuote({ fulfilment: "delivery", plz, zone, promoCode, promo, subtotalCents, tipCents: order.tipCents ?? 0, settings });
  if (!quote.ok) return { status: "rejected", reason: quote.reason, minimumCents: quote.minimumCents, subtotalCents: quote.subtotalCents };
  const breakdown: QuoteBreakdown = quote.breakdown;

  const [slotDate] = order.slotStartUtc.split("T");
  const slotsResult = await getSlotsFromStore({ fulfilment: "delivery", plz, date: slotDate }, now, { store, pool });
  if (slotsResult.status !== "slots") return { status: "rejected", reason: "slot-unavailable" };
  const chosen = slotsResult.slots.find((slot) => slot.startUtc === order.slotStartUtc);
  if (!chosen || chosen.remainingCapacity < 1) return { status: "rejected", reason: "slot-unavailable" };

  const requestHash = hashQuotePayload({
    cart: order.cart,
    fulfilment: "delivery",
    plz,
    promoCode,
    tipCents: order.tipCents ?? 0,
    slotStartUtc: order.slotStartUtc,
    paymentMethod: "cash_delivery",
    contact: { guestName: order.contact.guestName, guestPhone: order.contact.guestPhone, privacyVersion: PRIVACY_VERSION },
    deliveryAddress: order.deliveryAddress,
  });

  const idempotencyHash = sha256Hex(order.idempotencyKey);
  const publicToken = derivePublicOrderToken(secret, order.idempotencyKey);
  const publicTokenHash = sha256Hex(publicToken);
  const itemRows = buildItemRows(order.cart, menu);
  let orderId: string;
  try {
    const inserted = await pool.query<{ insert_delivery_order: string }>(
      `SELECT insert_delivery_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        publicTokenHash, idempotencyHash, requestHash, order.slotStartUtc,
        order.contact.guestName, order.contact.guestPhone, PRIVACY_VERSION,
        breakdown.subtotalCents, promoCode, breakdown.promoDiscountCents,
        breakdown.deliveryFeeCents, breakdown.tipCents, breakdown.totalCents,
        JSON.stringify(itemRows), order.deliveryAddress.street, order.deliveryAddress.houseNumber,
        plz, order.deliveryAddress.city, order.deliveryAddress.deliveryNote ?? null,
      ],
    );
    orderId = inserted.rows[0].insert_delivery_order;
  } catch (error) {
    const pgError = error as { code?: unknown; message?: unknown };
    if (typeof pgError.message === "string" && pgError.message.includes("slot is full")) return { status: "rejected", reason: "slot-unavailable" };
    if (pgError.code !== "23505") throw error;
    const existing = await pool.query<{ id: string; request_hash: string }>("SELECT id, request_hash FROM orders WHERE idempotency_hash = $1", [idempotencyHash]);
    if (existing.rows.length > 0 && existing.rows[0].request_hash === requestHash) {
      return { status: "created", order: await fetchOrderProjection(pool, existing.rows[0].id), token: publicToken, replayed: true };
    }
    return { status: "conflict" };
  }
  return { status: "created", order: await fetchOrderProjection(pool, orderId), token: publicToken, replayed: false };
}

export async function getPublicOrder(
  token: string,
  deps: OrderServiceDeps,
): Promise<{ status: "not-found" } | { status: "order"; order: OrderProjection }> {
  const result = await deps.pool.query<{ id: string }>(
    "SELECT id FROM orders WHERE public_token_hash = $1",
    [sha256Hex(token)],
  );
  if (result.rows.length === 0) return { status: "not-found" };
  return { status: "order", order: await fetchOrderProjection(deps.pool, result.rows[0].id) };
}

function parseCancelProjection(raw: unknown): CancelProjection {
  const value = raw as Record<string, unknown>;
  return {
    orderNumber: Number(value.orderNumber),
    state: "cancelled",
    scheduledFor: String(value.scheduledFor),
    subtotalCents: Number(value.subtotalCents),
    discountCents: Number(value.discountCents),
    tipCents: Number(value.tipCents),
    totalCents: Number(value.totalCents),
  };
}

export async function cancelPublicOrder(
  token: string,
  reason: string,
  deps: OrderServiceDeps,
): Promise<{ status: "neutral" } | { status: "cancelled"; order: CancelProjection }> {
  const reasonNormalized = (reason ?? "").trim().slice(0, 100) || "guest_cancelled";
  try {
    const result = await deps.pool.query<{ cancel_pending_order: unknown }>(
      "SELECT cancel_pending_order($1, $2)",
      [sha256Hex(token), reasonNormalized],
    );
    const value = result.rows[0]?.cancel_pending_order;
    if (!value) return { status: "neutral" };
    return { status: "cancelled", order: parseCancelProjection(value) };
  } catch {
    return { status: "neutral" };
  }
}
