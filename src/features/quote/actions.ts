"use server";

import { parseSupportedLocale } from "@/features/seo/site";
import { quoteRequestSchema, slotsRequestSchema, createQuote, getOrderSlots } from "./service";
import type { QuoteEngineResult, SlotsResult } from "./service";

type ActionContext = { locale: string };

export async function requestQuoteAction(
  raw: unknown,
  context: ActionContext,
): Promise<QuoteEngineResult> {
  const parsed = quoteRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", reason: "service-unavailable" };
  }
  return createQuote(parsed.data, parseSupportedLocale(context.locale));
}

export async function requestSlotsAction(raw: unknown): Promise<SlotsResult> {
  const parsed = slotsRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", reason: "service-unavailable" };
  }
  return getOrderSlots(parsed.data);
}