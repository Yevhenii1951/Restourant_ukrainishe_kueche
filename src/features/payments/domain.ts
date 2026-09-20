import { z } from "zod";
import { CART_SCHEMA } from "@/features/cart/domain";
import { DELIVERY_ADDRESS_SCHEMA, ORDER_CONTACT_SCHEMA } from "@/features/order/domain";

export const stripePaymentMethodSchema = z.enum(["stripe_card", "stripe_paypal"]);

export const createStripeCheckoutSchema = z
  .object({
    quoteToken: z.string().min(1).max(1000),
    cart: CART_SCHEMA,
    fulfilment: z.enum(["pickup", "delivery"]),
    plz: z.string().trim().max(10).nullish(),
    promoCode: z.string().trim().max(40).nullish(),
    tipCents: z.number().int().min(0).max(1_000_000).nullish(),
    slotStartUtc: z.string().datetime(),
    paymentMethod: stripePaymentMethodSchema,
    contact: ORDER_CONTACT_SCHEMA,
    deliveryAddress: DELIVERY_ADDRESS_SCHEMA.nullish(),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.fulfilment === "delivery" && !value.deliveryAddress) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryAddress"], message: "required" });
    }
    if (value.fulfilment === "pickup" && value.deliveryAddress) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryAddress"], message: "unexpected" });
    }
  });

export type CreateStripeCheckoutInput = z.infer<typeof createStripeCheckoutSchema>;
export type StripePaymentMethod = z.infer<typeof stripePaymentMethodSchema>;

export const requestRefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(1).max(200),
}).strict();

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
