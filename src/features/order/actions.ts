"use server";

import { parseSupportedLocale } from "@/features/seo/site";
import { createOrderRuntime } from "./runtime";
import { createPickupOrder, createDeliveryOrder, getPublicOrder, cancelPublicOrder } from "./service";
import type { OrderResult } from "./service";
import type { CancelProjection, OrderProjection } from "./domain";

type ActionContext = { locale: string };

export type PublicOrderResult =
  | { status: "not-found" }
  | { status: "order"; order: OrderProjection };

export type CancelOrderResult =
  | { status: "neutral" }
  | { status: "cancelled"; order: CancelProjection };

export async function createPickupOrderAction(
  raw: unknown,
  context: ActionContext,
): Promise<OrderResult> {
  const runtime = createOrderRuntime();
  if (!runtime) return { status: "error", reason: "service-unavailable" };
  return createPickupOrder(raw, parseSupportedLocale(context.locale), runtime);
}

export async function createDeliveryOrderAction(
  raw: unknown,
  context: ActionContext,
): Promise<OrderResult> {
  const runtime = createOrderRuntime();
  if (!runtime) return { status: "error", reason: "service-unavailable" };
  return createDeliveryOrder(raw, parseSupportedLocale(context.locale), runtime);
}

export async function getPublicOrderAction(token: string): Promise<PublicOrderResult> {
  const runtime = createOrderRuntime();
  if (!runtime) return { status: "not-found" };
  return getPublicOrder(token, runtime);
}

export async function cancelPublicOrderAction(
  token: string,
  reason: string,
): Promise<CancelOrderResult> {
  const runtime = createOrderRuntime();
  if (!runtime) return { status: "neutral" };
  return cancelPublicOrder(token, reason, runtime);
}
