import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import type { SupportedLocale } from "@/features/menu/domain";
import { getPublicMenu } from "@/features/menu/service";
import {
  CART_SCHEMA,
  estimateLineTotalCents,
  validateCart,
  type CartIssue,
} from "@/features/cart/domain";
import {
  QUOTE_TTL_MS,
  calculateQuote,
  hashQuotePayload,
  normalizeGermanPlz,
  signQuote,
  type QuoteBreakdown,
} from "./domain";
import { promoWindowOpen, type QuoteStore } from "./store";
import { createSupabaseQuoteStore } from "./supabaseQuoteStore";
import { getSlotsFromStore, type CoreSlotsResult } from "./slotsService";

export const SUPPORTED_SETTING_KEYS = [
  "pickup_minimum_cents",
  "asap_lead_minutes",
  "scheduling_horizon_days",
  "slot_interval_minutes",
  "max_line_quantity",
] as const;

export const quoteRequestSchema = z.object({
  cart: CART_SCHEMA,
  fulfilment: z.enum(["pickup", "delivery"]),
  plz: z.string().trim().max(10).nullish(),
  promoCode: z.string().trim().max(40).nullish(),
  tipCents: z.number().int().min(0).max(1_000_000).nullish(),
  slotStartUtc: z.string().datetime().nullish(),
});

export const slotsRequestSchema = z.object({
  fulfilment: z.enum(["pickup", "delivery"]),
  plz: z.string().trim().max(10).nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type SlotsRequest = z.infer<typeof slotsRequestSchema>;

export interface QuoteLineTotal {
  menuItemId: string;
  quantity: number;
  lineTotalCents: number;
}

export type QuoteEngineResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "needs-attention"; cartIssues: CartIssue[] }
  | {
      status: "rejected";
      reason: "minimum-not-met" | "promo-minimum-not-met" | "promo-invalid" | "zone-not-eligible" | "slot-unavailable";
      minimumCents?: number;
      subtotalCents?: number;
    }
  | {
      status: "quote";
      quoteToken: string;
      expiresAtMs: number;
      breakdown: QuoteBreakdown;
      lines: QuoteLineTotal[];
    };

export type SlotsResult = CoreSlotsResult;

interface QuoteServiceDeps {
  now?: Date;
  signingSecret?: string;
}

function storeAvailable(): boolean {
  return Boolean(
    serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY && serverEnv.QUOTE_SIGNING_SECRET,
  );
}

export async function createQuote(
  input: QuoteRequest,
  locale: SupportedLocale,
  deps: QuoteServiceDeps = {},
): Promise<QuoteEngineResult> {
  if (!storeAvailable()) {
    return { status: "error", reason: "service-unavailable" };
  }
  const now = deps.now ?? new Date();
  const nowMs = now.getTime();
  const secret = deps.signingSecret ?? (serverEnv.QUOTE_SIGNING_SECRET as string);
  const store: QuoteStore = createSupabaseQuoteStore(getSupabaseServerClient());

  const settings = await store.getCommerceSettings();
  if (!settings) return { status: "error", reason: "service-unavailable" };

  const menu = await getPublicMenu(locale);
  const itemsById = new Map(menu.items.map((item) => [item.id, item]));

  const cartIssues = validateCart(input.cart, itemsById);
  for (const line of input.cart.lines) {
    if (line.quantity > settings.maxLineQuantity) {
      cartIssues.push({ lineIndex: input.cart.lines.indexOf(line), kind: "invalid-quantity", actual: line.quantity });
    }
  }
  if (cartIssues.length > 0) {
    return { status: "needs-attention", cartIssues };
  }

  const subtotalCents = input.cart.lines.reduce(
    (sum, cartLine) => sum + estimateLineTotalCents(itemsById.get(cartLine.menuItemId)!, cartLine),
    0,
  );

  const plz =
    input.fulfilment === "delivery" ? normalizeGermanPlz(input.plz ?? "") : null;
  const zone = plz ? await store.getDeliveryZoneByPlz(plz) : null;

  let promo: { mode: "percent" | "fixed"; value: number; minimumSubtotalCents: number } | null =
    null;
  const promoCode = input.promoCode?.trim().toUpperCase() || null;
  if (promoCode) {
    const promoRow = await store.getPromoByCodeLookup(promoCode);
    if (promoRow && promoWindowOpen(promoRow, nowMs)) {
      promo = { mode: promoRow.mode, value: promoRow.value, minimumSubtotalCents: promoRow.minimumSubtotalCents };
    }
  }

  const quote = calculateQuote({
    fulfilment: input.fulfilment,
    plz,
    zone,
    promoCode,
    promo,
    subtotalCents,
    tipCents: input.tipCents ?? 0,
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

  if (input.slotStartUtc) {
    const [fulfilmentDate] = input.slotStartUtc.split("T");
    const slots = await getOrderSlots(
      {
        fulfilment: input.fulfilment,
        plz: input.fulfilment === "delivery" ? plz : null,
        date: fulfilmentDate,
      },
      now,
    );
    const chosen =
      slots.status === "slots"
        ? slots.slots.find((slot) => slot.startUtc === input.slotStartUtc)
        : undefined;
    if (!chosen || chosen.remainingCapacity < 1) {
      return { status: "rejected", reason: "slot-unavailable" };
    }
  }

  const tokenPayload = {
    cart: input.cart,
    fulfilment: input.fulfilment,
    plz,
    promoCode,
    tipCents: input.tipCents ?? 0,
    slotStartUtc: input.slotStartUtc ?? null,
  };
  const payloadHash = hashQuotePayload(tokenPayload);
  const quoteToken = signQuote(
    { quoteId: randomUUID(), expiresAtMs: nowMs + QUOTE_TTL_MS, payloadHash },
    secret,
  );

  return {
    status: "quote",
    quoteToken,
    expiresAtMs: nowMs + QUOTE_TTL_MS,
    breakdown: quote.breakdown,
    lines: input.cart.lines.map((cartLine) => ({
      menuItemId: cartLine.menuItemId,
      quantity: cartLine.quantity,
      lineTotalCents: estimateLineTotalCents(itemsById.get(cartLine.menuItemId)!, cartLine),
    })),
  };
}

export async function getOrderSlots(
  input: SlotsRequest,
  now?: Date,
): Promise<SlotsResult> {
  if (!storeAvailable()) {
    return { status: "error", reason: "service-unavailable" };
  }
  const store: QuoteStore = createSupabaseQuoteStore(getSupabaseServerClient());
  return getSlotsFromStore(
    { fulfilment: input.fulfilment, plz: input.plz, date: input.date },
    now ?? new Date(),
    { store },
  );
}