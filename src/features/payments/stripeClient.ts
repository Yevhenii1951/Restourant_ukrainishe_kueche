import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env/server";
import type { StripePaymentMethod } from "./domain";

export interface CheckoutSessionInput {
  amountCents: number;
  cancelUrl: string;
  currency: "EUR";
  locale: string;
  orderId: string;
  orderNumber: number;
  paymentMethod: StripePaymentMethod;
  successUrl: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface StripeCheckoutClient {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
}

export interface StripeRefundInput {
  amountCents: number;
  idempotencyKey: string;
  paymentIntentId: string;
}

export interface StripeRefundResult {
  id: string;
  succeeded: boolean;
}

export interface StripeRefundClient {
  createFullRefund(input: StripeRefundInput): Promise<StripeRefundResult>;
}

export function createStripeCheckoutClient(): (StripeCheckoutClient & StripeRefundClient) | null {
  if (!serverEnv.STRIPE_SECRET_KEY) return null;
  const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  return {
    async createCheckoutSession(input): Promise<CheckoutSessionResult> {
      const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        input.paymentMethod === "stripe_paypal" ? ["card", "paypal"] : ["card"];
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethods,
        locale: input.locale === "de" || input.locale === "en" ? input.locale : "de",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.orderId,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: { name: `Kalyna Bestellung #${input.orderNumber}` },
          },
        }],
        metadata: {
          orderId: input.orderId,
          orderNumber: String(input.orderNumber),
          amountCents: String(input.amountCents),
          currency: input.currency,
        },
        payment_intent_data: {
          metadata: { orderId: input.orderId, orderNumber: String(input.orderNumber) },
        },
      });
      if (!session.url) throw new Error("Stripe Checkout returned no URL");
      return { id: session.id, url: session.url };
    },
    async createFullRefund(input): Promise<StripeRefundResult> {
      const refund = await stripe.refunds.create({
        amount: input.amountCents,
        payment_intent: input.paymentIntentId,
      }, { idempotencyKey: input.idempotencyKey });
      return { id: refund.id, succeeded: refund.status === "succeeded" };
    },
  };
}
