import { z } from "zod";
import { stripePaymentMethodSchema } from "@/features/payments/domain";

export const buyVoucherSchema = z.object({
  productId: z.string().uuid(),
  buyerEmail: z.string().trim().email().max(254),
  paymentMethod: stripePaymentMethodSchema,
}).strict();

export type BuyVoucherInput = z.infer<typeof buyVoucherSchema>;

export interface VoucherProduct {
  id: string;
  name: string;
  denominationCents: number;
}

export type VoucherCheckoutResult =
  | { status: "checkout"; redirectUrl: string }
  | { status: "rejected"; reason: "input" | "not-found" | "paypal-unavailable" }
  | { status: "error"; reason: "service-unavailable" };
