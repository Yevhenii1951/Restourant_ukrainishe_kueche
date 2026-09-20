import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { CART_SCHEMA } from "@/features/cart/domain";
import type { OrderState } from "./transitions";

export { ORDER_STATES, ORDER_TRANSITIONS, isLegalOrderTransition } from "./transitions";
export type { OrderState } from "./transitions";

export const PRIVACY_VERSION = "1";

export const ORDER_CONTACT_SCHEMA = z
  .object({
    guestName: z.string().trim().min(1).max(80),
    guestPhone: z.string().trim().min(3).max(30),
    privacyVersion: z.literal(PRIVACY_VERSION),
    privacyAccepted: z.boolean(),
  })
  .strict();

export const DELIVERY_ADDRESS_SCHEMA = z
  .object({
    street: z.string().trim().min(1).max(120),
    houseNumber: z.string().trim().min(1).max(20),
    postalCode: z.string().trim().regex(/^\d{5}$/),
    city: z.string().trim().min(1).max(80),
    deliveryNote: z.string().trim().max(300).nullish(),
  })
  .strict();

export const createOrderSchema = z
  .object({
    quoteToken: z.string().min(1).max(1000),
    cart: CART_SCHEMA,
    fulfilment: z.literal("pickup"),
    plz: z.string().trim().max(10).nullish(),
    promoCode: z.string().trim().max(40).nullish(),
    tipCents: z.number().int().min(0).max(1_000_000).nullish(),
    slotStartUtc: z.string().datetime(),
    paymentMethod: z.literal("cash_pickup"),
    contact: ORDER_CONTACT_SCHEMA,
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const createDeliveryOrderSchema = z
  .object({
    quoteToken: z.string().min(1).max(1000),
    cart: CART_SCHEMA,
    fulfilment: z.literal("delivery"),
    plz: z.string().trim().max(10),
    promoCode: z.string().trim().max(40).nullish(),
    tipCents: z.number().int().min(0).max(1_000_000).nullish(),
    slotStartUtc: z.string().datetime(),
    paymentMethod: z.literal("cash_delivery"),
    contact: ORDER_CONTACT_SCHEMA,
    deliveryAddress: DELIVERY_ADDRESS_SCHEMA,
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>;

export const ORDER_CONTACT_SNAPSHOT_SCHEMA = z
  .object({
    guestName: z.string().trim().min(1).max(80),
    guestPhone: z.string().trim().min(3).max(30),
    privacyVersion: z.literal(PRIVACY_VERSION),
  })
  .strict();

export interface OrderModifierProjection {
  groupName: string;
  optionName: string;
  deltaCents: number;
}

export interface OrderLineProjection {
  name: string;
  quantity: number;
  lineTotalCents: number;
  modifiers: OrderModifierProjection[];
}

export interface OrderProjection {
  orderNumber: number;
  state: OrderState;
  scheduledFor: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  totalCents: number;
  lines: OrderLineProjection[];
}

export interface CancelProjection {
  orderNumber: number;
  state: "cancelled";
  scheduledFor: string;
  subtotalCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Deterministic: the same idempotency key always yields the same opaque public
// token, so an idempotent replay reproduces the original link without the
// server ever storing the raw token.
export function derivePublicOrderToken(secret: string, idempotencyKey: string): string {
  return createHmac("sha256", secret).update(`order-token:${idempotencyKey}`).digest("base64url");
}

export const MAX_ESTIMATE_MINUTES = 240;

export const transitionOrderSchema = z
  .object({
    orderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    targetState: z.enum(["accepted", "rejected", "preparing", "ready", "completed", "cancelled"]),
    reason: z.string().trim().max(200).nullish(),
    estimateMinutes: z
      .number()
      .int()
      .min(1)
      .max(MAX_ESTIMATE_MINUTES)
      .nullish(),
  })
  .strict();

export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;

export function transitionValidation(input: TransitionOrderInput): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  if (input.targetState === "cancelled" || input.targetState === "rejected") {
    if (!input.reason) fields.reason = ["Für Stornierung/Ablehnung ist ein Grund erforderlich."];
  }
  if (input.targetState === "accepted" && !input.estimateMinutes) {
    fields.estimateMinutes = ["Für die Annahme ist eine Fertigstellungszeit erforderlich."];
  }
  return fields;
}

export interface StaffOrderLineProjection {
  name: string;
  quantity: number;
  lineTotalCents: number;
  modifiers: OrderModifierProjection[];
}

export interface StaffOrderListItem {
  orderId: string;
  orderNumber: number;
  fulfilment: "pickup" | "delivery";
  state: OrderState;
  scheduledFor: string;
  totalCents: number;
  version: number;
  guestName: string | null;
  guestPhone: string | null;
  itemCount: number;
  lineSummary: string;
}

export interface StaffOrderStatusEvent {
  fromState: OrderState | null;
  toState: OrderState;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface StaffOrderDetail extends StaffOrderListItem {
  subtotalCents: number;
  discountCents: number;
  tipCents: number;
  acceptedEstimateMinutes: number | null;
  lines: StaffOrderLineProjection[];
  events: StaffOrderStatusEvent[];
  deliveryAddress: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    deliveryNote: string | null;
  } | null;
}

export interface AppliedTransitionProjection {
  orderNumber: number;
  state: OrderState;
  version: number;
  scheduledFor: string;
  estimateMinutes: number | null;
}

export interface PickupAcceptingState {
  enabled: boolean;
}
