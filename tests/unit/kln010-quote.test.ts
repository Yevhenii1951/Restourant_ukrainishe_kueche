import { describe, expect, it } from "vitest";
import {
  QUOTE_TTL_MS,
  applyPromo,
  calculateQuote,
  computeDeliveryFee,
  hashQuotePayload,
  normalizeGermanPlz,
  signQuote,
  verifyQuote,
  type DeliveryZone,
  type Promo,
  type QuoteResult,
} from "@/features/quote/domain";

const ZONE: DeliveryZone = {
  zoneName: "Kassel",
  postalCodes: ["34117"],
  feeCents: 390,
  minimumCents: 1500,
  freeDeliveryCents: 3000,
};

const SETTINGS = {
  pickupMinimumCents: 0,
  asapLeadMinutes: 30,
  schedulingHorizonDays: 14,
  slotIntervalMinutes: 15,
  maxLineQuantity: 20,
} as const;

const PERCENT_10: Promo = { mode: "percent", value: 10, minimumSubtotalCents: 1500 };
const PERCENT_10_NO_MIN: Promo = { mode: "percent", value: 10, minimumSubtotalCents: 0 };
const FIXED_500_NO_MIN: Promo = { mode: "fixed", value: 500, minimumSubtotalCents: 0 };

const NOW = new Date("2026-10-07T09:00:00.000Z");
const TTL_PLUS = NOW.getTime() + QUOTE_TTL_MS;

describe("KLN-010 PLZ normalization (FR-ORD-3)", () => {
  it("normalizes a clean five-digit German PLZ", () => {
    expect(normalizeGermanPlz("34117")).toBe("34117");
  });

  it("strips separators and whitespace", () => {
    expect(normalizeGermanPlz(" 34.117 ")).toBe("34117");
    expect(normalizeGermanPlz("34-117")).toBe("34117");
  });

  it("rejects anything that is not exactly five digits", () => {
    expect(normalizeGermanPlz("3411")).toBeNull();
    expect(normalizeGermanPlz("341177")).toBeNull();
    expect(normalizeGermanPlz("abcde")).toBeNull();
    expect(normalizeGermanPlz("")).toBeNull();
  });
});

describe("KLN-010 promo boundaries (FR-ORD-12)", () => {
  it("applies no discount when no code is present", () => {
    expect(applyPromo({ subtotalCents: 2000, promoCode: null, promo: null })).toEqual({
      discountCents: 0,
      promoApplied: false,
      belowMinimum: false,
    });
  });

  it("reports an invalid code that is not resolved", () => {
    const result = applyPromo({ subtotalCents: 2000, promoCode: "X", promo: null });
    expect(result.promoApplied).toBe(false);
    expect(result.belowMinimum).toBe(false);
  });

  it("rounds percentage discounts half-up to the nearest cent", () => {
    expect(applyPromo({ subtotalCents: 1357, promoCode: "P", promo: PERCENT_10_NO_MIN })).toMatchObject({
      discountCents: 136,
    });
    expect(applyPromo({ subtotalCents: 15, promoCode: "P", promo: PERCENT_10_NO_MIN })).toMatchObject({
      discountCents: 2,
    });
  });

  it("caps the discount at the subtotal", () => {
    expect(applyPromo({ subtotalCents: 150, promoCode: "P", promo: PERCENT_10_NO_MIN })).toMatchObject({
      discountCents: 15,
      promoApplied: true,
    });
  });

  it("never lets a fixed discount push the subtotal negative", () => {
    const result = applyPromo({ subtotalCents: 300, promoCode: "F", promo: FIXED_500_NO_MIN });
    expect(result).toMatchObject({ discountCents: 300 });
  });

  it("signals when the subtotal is below the promo minimum", () => {
    const result = applyPromo({ subtotalCents: 1400, promoCode: "P", promo: PERCENT_10 });
    expect(result).toEqual({ discountCents: 0, promoApplied: false, belowMinimum: true });
  });
});

describe("KLN-010 delivery fee and free threshold (FR-ORD-5)", () => {
  it("charges the zone fee below the free threshold", () => {
    expect(computeDeliveryFee(2999, ZONE)).toEqual({ feeCents: 390, freeApplied: false });
  });

  it("waives the fee exactly at and above the free threshold", () => {
    expect(computeDeliveryFee(3000, ZONE)).toEqual({ feeCents: 0, freeApplied: true });
    expect(computeDeliveryFee(3001, ZONE)).toEqual({ feeCents: 0, freeApplied: true });
  });
});

describe("KLN-010 minimum order boundaries (FR-ORD-5)", () => {
  it("rejects delivery one cent below the minimum after promo", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "delivery",
      plz: "34117",
      zone: ZONE,
      promoCode: null,
      promo: null,
      subtotalCents: 1499,
      tipCents: 0,
      settings: SETTINGS,
    });
    expect(result).toEqual({
      ok: false,
      reason: "minimum-not-met",
      minimumCents: 1500,
      subtotalCents: 1499,
    });
  });

  it("accepts delivery exactly at the minimum", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "delivery",
      plz: "34117",
      zone: ZONE,
      promoCode: null,
      promo: null,
      subtotalCents: 1500,
      tipCents: 0,
      settings: SETTINGS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.breakdown.postPromoSubtotalCents).toBe(1500);
    expect(result.breakdown.minimumCents).toBe(1500);
  });

  it("rejects when the promo discount drops the subtotal below the minimum", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "delivery",
      plz: "34117",
      zone: ZONE,
      promoCode: "P",
      promo: PERCENT_10,
      subtotalCents: 1650,
      tipCents: 0,
      settings: SETTINGS,
    });
    expect(result).toEqual({
      ok: false,
      reason: "minimum-not-met",
      minimumCents: 1500,
      subtotalCents: 1485,
    });
  });

  it("keeps tip outside the minimum and total calculation", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "delivery",
      plz: "34117",
      zone: ZONE,
      promoCode: null,
      promo: null,
      subtotalCents: 1500,
      tipCents: 200,
      settings: SETTINGS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.breakdown.totalCents).toBe(1500 + 390 + 200);
  });
});

describe("KLN-010 itemized quote totals (FR-CART-3, FR-ORD-5, AC-1)", () => {
  it("itemizes subtotal, discount, delivery, tip and total", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "delivery",
      plz: "34117",
      zone: ZONE,
      promoCode: "P",
      promo: PERCENT_10,
      subtotalCents: 3200,
      tipCents: 150,
      settings: SETTINGS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const breakdown = result.breakdown;
    expect(breakdown).toEqual({
      subtotalCents: 3200,
      promoDiscountCents: 320,
      postPromoSubtotalCents: 2880,
      deliveryFeeCents: 390,
      tipCents: 150,
      totalCents: 3420,
      minimumCents: 1500,
      freeDeliveryApplied: false,
      promoCodeApplied: "P",
    });
  });

  it("rejects an unresolvable promo code as invalid", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "pickup",
      plz: null,
      zone: null,
      promoCode: "GIBTESNICHT",
      promo: null,
      subtotalCents: 2000,
      tipCents: 0,
      settings: SETTINGS,
    });
    expect(result).toEqual({ ok: false, reason: "promo-invalid" });
  });

  it("rejects delivery without an eligible zone", () => {
    const result: QuoteResult = calculateQuote({
      fulfilment: "delivery",
      plz: "99999",
      zone: null,
      promoCode: null,
      promo: null,
      subtotalCents: 2500,
      tipCents: 0,
      settings: SETTINGS,
    });
    expect(result).toEqual({ ok: false, reason: "zone-not-eligible" });
  });
});

describe("KLN-010 opaque expiring quote token", () => {
  it("signs and verifies a quote within its TTL", () => {
    const payloadHash = hashQuotePayload({ ful: "pickup", lines: [{ id: "a", qty: 1 }] });
    const token = signQuote(
      { quoteId: "abc-123", expiresAtMs: TTL_PLUS, payloadHash },
      "secret",
    );
    expect(token).not.toContain("abc-123");
    expect(verifyQuote(token, "secret", NOW.getTime())).toEqual({
      quoteId: "abc-123",
      expiresAtMs: TTL_PLUS,
      payloadHash,
    });
  });

  it("rejects expired, tampered and wrongly-signed quotes", () => {
    const payloadHash = hashQuotePayload({ x: 1 });
    const token = signQuote({ quoteId: "q", expiresAtMs: TTL_PLUS, payloadHash }, "secret");
    expect(verifyQuote(token, "secret", TTL_PLUS + 1)).toBeNull();
    const tampered = token.slice(0, token.length - 1) + (token.endsWith("a") ? "b" : "a");
    expect(verifyQuote(tampered, "secret", NOW.getTime())).toBeNull();
    expect(verifyQuote(token, "other-secret", NOW.getTime())).toBeNull();
  });

  it("binds the token to its payload so stale checkout cannot be reused", () => {
    const originalHash = hashQuotePayload({ ful: "delivery", plz: "34117", subtotal: 3200 });
    const token = signQuote({ quoteId: "q", expiresAtMs: TTL_PLUS, payloadHash: originalHash }, "secret");
    const forgedHash = hashQuotePayload({ ful: "delivery", plz: "34117", subtotal: 50 });
    const verified = verifyQuote(token, "secret", NOW.getTime());
    expect(verified).not.toBeNull();
    expect(verified?.payloadHash).toBe(originalHash);
    expect(forgedHash).not.toBe(originalHash);
  });
});