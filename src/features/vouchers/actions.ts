"use server";

import { parseSupportedLocale } from "@/features/seo/site";
import { createVoucherRuntime } from "./runtime";
import { createVoucherCheckout, listVoucherProducts } from "./service";
import type { VoucherCheckoutResult, VoucherProduct } from "./domain";

export async function listVoucherProductsAction(locale: string): Promise<VoucherProduct[]> {
  const runtime = createVoucherRuntime();
  if (!runtime) return [];
  return listVoucherProducts(parseSupportedLocale(locale), runtime.pool);
}

export async function createVoucherCheckoutAction(
  raw: unknown,
  context: { locale: string },
): Promise<VoucherCheckoutResult> {
  const runtime = createVoucherRuntime();
  if (!runtime) return { status: "error", reason: "service-unavailable" };
  return createVoucherCheckout(raw, parseSupportedLocale(context.locale), runtime);
}
