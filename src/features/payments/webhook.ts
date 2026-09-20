import Stripe from "stripe";
import type { DatabaseRunner } from "@/features/quote/slotsService";

export type StripeWebhookResult = "paid" | "refunded" | "duplicate" | "ignored" | "mismatch" | "not-bound" | "invalid";

interface StripeWebhookRow {
  mark_stripe_checkout_paid?: { status?: string };
  mark_stripe_refund_succeeded?: { status?: string };
}

function paymentIntentId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

function stripeRefund(event: Stripe.Event): { id: string; amount: number; currency: string } | null {
  if (event.type !== "refund.updated") return null;
  const refund = event.data.object as Stripe.Refund;
  if (!refund.id || typeof refund.amount !== "number" || !refund.currency || refund.status !== "succeeded") return null;
  return { id: refund.id, amount: refund.amount, currency: refund.currency };
}

export function constructStripeWebhookEvent(rawBody: string, signature: string, secret: string): Stripe.Event {
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  pool: DatabaseRunner,
): Promise<StripeWebhookResult> {
  const refund = stripeRefund(event);
  if (refund) {
    const result = await pool.query<StripeWebhookRow>(
      "SELECT mark_stripe_refund_succeeded($1,$2,$3::jsonb,$4,$5,$6)",
      [event.id, event.type, JSON.stringify(event.data.object), refund.id, refund.amount, refund.currency.toUpperCase()],
    );
    const status = result.rows[0]?.mark_stripe_refund_succeeded?.status;
    if (status === "refunded" || status === "duplicate") return status;
    if (status === "amount-currency-mismatch") return "mismatch";
    if (status === "not-bound") return "not-bound";
    return "invalid";
  }
  if (event.type !== "checkout.session.completed") return "ignored";
  const session = event.data.object as Stripe.Checkout.Session;
  const intentId = paymentIntentId(session.payment_intent);
  if (!session.id || typeof session.amount_total !== "number" || !session.currency || !intentId) {
    return "invalid";
  }

  const payload = {
    id: session.id,
    object: session.object,
    amount_total: session.amount_total,
    currency: session.currency,
    payment_intent: intentId,
    metadata: session.metadata ?? {},
  };
  const result = await pool.query<StripeWebhookRow>(
    "SELECT mark_stripe_checkout_paid($1,$2,$3::jsonb,$4,$5,$6,$7)",
    [event.id, event.type, JSON.stringify(payload), session.id, payload.payment_intent, session.amount_total, session.currency.toUpperCase()],
  );
  const status = result.rows[0]?.mark_stripe_checkout_paid?.status;
  if (status === "paid" || status === "duplicate") return status;
  if (status === "amount-currency-mismatch") return "mismatch";
  if (status === "not-bound") return "not-bound";
  return "invalid";
}
