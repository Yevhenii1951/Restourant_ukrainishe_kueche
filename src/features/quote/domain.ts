import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const QUOTE_TTL_MS = 10 * 60 * 1000;

export type Fulfilment = "pickup" | "delivery";

export function normalizeGermanPlz(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 5 ? digits : null;
}

export interface DeliveryZone {
  zoneName: string;
  postalCodes: string[];
  feeCents: number;
  minimumCents: number;
  freeDeliveryCents: number;
}

export type PromoMode = "percent" | "fixed";

export interface Promo {
  mode: PromoMode;
  value: number;
  minimumSubtotalCents: number;
}

export interface CommerceSettings {
  pickupMinimumCents: number;
  asapLeadMinutes: number;
  schedulingHorizonDays: number;
  slotIntervalMinutes: number;
  maxLineQuantity: number;
}

export interface QuoteBreakdown {
  subtotalCents: number;
  promoDiscountCents: number;
  postPromoSubtotalCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  totalCents: number;
  minimumCents: number;
  freeDeliveryApplied: boolean;
  promoCodeApplied: string | null;
}

export type QuoteResult =
  | { ok: true; breakdown: QuoteBreakdown }
  | { ok: false; reason: QuoteFailureReason; minimumCents?: number; subtotalCents?: number };

export type QuoteFailureReason =
  | "minimum-not-met"
  | "promo-minimum-not-met"
  | "promo-invalid"
  | "zone-not-eligible";

interface PromoApplication {
  discountCents: number;
  promoApplied: boolean;
  belowMinimum: boolean;
}

export function applyPromo(input: {
  subtotalCents: number;
  promoCode: string | null;
  promo: Promo | null;
}): PromoApplication {
  if (!input.promoCode || !input.promo) {
    return { discountCents: 0, promoApplied: false, belowMinimum: false };
  }
  if (input.subtotalCents < input.promo.minimumSubtotalCents) {
    return { discountCents: 0, promoApplied: false, belowMinimum: true };
  }
  const discount =
    input.promo.mode === "percent"
      ? Math.round((input.subtotalCents * input.promo.value) / 100)
      : input.promo.value;
  return {
    discountCents: Math.min(discount, input.subtotalCents),
    promoApplied: true,
    belowMinimum: false,
  };
}

export function computeDeliveryFee(
  postPromoSubtotalCents: number,
  zone: DeliveryZone,
): { feeCents: number; freeApplied: boolean } {
  if (postPromoSubtotalCents >= zone.freeDeliveryCents) {
    return { feeCents: 0, freeApplied: true };
  }
  return { feeCents: zone.feeCents, freeApplied: false };
}

export function calculateQuote(input: {
  fulfilment: Fulfilment;
  plz: string | null;
  zone: DeliveryZone | null;
  promoCode: string | null;
  promo: Promo | null;
  subtotalCents: number;
  tipCents: number;
  settings: CommerceSettings;
}): QuoteResult {
  if (input.fulfilment === "delivery" && !input.zone) {
    return { ok: false, reason: "zone-not-eligible" };
  }

  const minimumCents =
    input.fulfilment === "delivery"
      ? input.zone!.minimumCents
      : input.settings.pickupMinimumCents;

  if (input.promoCode && !input.promo) {
    return { ok: false, reason: "promo-invalid" };
  }

  const promotion = applyPromo({
    subtotalCents: input.subtotalCents,
    promoCode: input.promoCode,
    promo: input.promo,
  });
  if (promotion.belowMinimum) {
    return {
      ok: false,
      reason: "promo-minimum-not-met",
      minimumCents: input.promo!.minimumSubtotalCents,
      subtotalCents: input.subtotalCents,
    };
  }

  const postPromoSubtotalCents = input.subtotalCents - promotion.discountCents;
  if (postPromoSubtotalCents < minimumCents) {
    return {
      ok: false,
      reason: "minimum-not-met",
      minimumCents,
      subtotalCents: postPromoSubtotalCents,
    };
  }

  const delivery =
    input.fulfilment === "delivery" && input.zone
      ? computeDeliveryFee(postPromoSubtotalCents, input.zone)
      : { feeCents: 0, freeApplied: false };

  const totalCents =
    postPromoSubtotalCents + delivery.feeCents + Math.max(0, input.tipCents);

  return {
    ok: true,
    breakdown: {
      subtotalCents: input.subtotalCents,
      promoDiscountCents: promotion.discountCents,
      postPromoSubtotalCents,
      deliveryFeeCents: delivery.feeCents,
      tipCents: Math.max(0, input.tipCents),
      totalCents,
      minimumCents,
      freeDeliveryApplied: delivery.freeApplied,
      promoCodeApplied: promotion.promoApplied ? input.promoCode : null,
    },
  };
}

interface QuoteClaim {
  quoteId: string;
  expiresAtMs: number;
  payloadHash: string;
}

function canonicalSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalSort);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => [key, canonicalSort(entry)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function hashQuotePayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalSort(payload))).digest("hex");
}

function encode(opaque: string): string {
  return Buffer.from(opaque, "utf8").toString("base64url");
}

function decode(tokenPart: string): string {
  return Buffer.from(tokenPart, "base64url").toString("utf8");
}

export function signQuote(claim: QuoteClaim, secret: string): string {
  const payload = encode(JSON.stringify(claim));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyQuote(
  token: string,
  secret: string,
  nowMs: number,
): QuoteClaim | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = new Uint8Array(Buffer.from(signature));
  const right = new Uint8Array(Buffer.from(expected));
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  let claim: QuoteClaim;
  try {
    claim = JSON.parse(decode(payload)) as QuoteClaim;
  } catch {
    return null;
  }
  if (typeof claim.quoteId !== "string" || typeof claim.expiresAtMs !== "number") {
    return null;
  }
  if (nowMs > claim.expiresAtMs) return null;
  return claim;
}