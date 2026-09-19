import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { CART_SCHEMA } from "@/features/cart/domain";

export const ORDER_STATES = [
  "pending_confirmation",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "rejected",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export const PRIVACY_VERSION = "1";

export const ORDER_CONTACT_SCHEMA = z
  .object({
    guestName: z.string().trim().min(1).max(80),
    guestPhone: z.string().trim().min(3).max(30),
    privacyVersion: z.literal(PRIVACY_VERSION),
    privacyAccepted: z.boolean(),
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

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

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