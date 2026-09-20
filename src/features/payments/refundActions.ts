"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/features/identity/session";
import { createCorrelationId } from "@/lib/correlationId";
import { getPool } from "@/features/order/runtime";
import { createStripeCheckoutClient } from "./stripeClient";
import { requestRefundSchema } from "./domain";

type RefundActionResult =
  | { ok: true; correlationId: string }
  | { ok: false; code: "FORBIDDEN" | "INVALID" | "NOT_REFUNDABLE" | "EXTERNAL_FAILURE"; correlationId: string };

interface PreparedRefund {
  status: "ready" | "pending" | "succeeded" | "not-refundable";
  refundId?: string;
  paymentIntentId?: string;
  amountCents?: number;
  idempotencyKey?: string;
}

export async function requestFullRefundAction(input: unknown): Promise<RefundActionResult> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor || !actor.active || actor.role !== "ADMIN") return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = requestRefundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID", correlationId };
  const pool = getPool();
  const stripe = createStripeCheckoutClient();
  if (!pool || !stripe) return { ok: false, code: "EXTERNAL_FAILURE", correlationId };

  const prepared = await pool.query<{ prepare_stripe_full_refund: PreparedRefund }>(
    "SELECT prepare_stripe_full_refund($1,$2,$3,$4)",
    [parsed.data.orderId, parsed.data.reason, actor.id, correlationId],
  );
  const refund = prepared.rows[0]?.prepare_stripe_full_refund;
  if (!refund || refund.status === "not-refundable") return { ok: false, code: "NOT_REFUNDABLE", correlationId };
  if (refund.status === "pending" || refund.status === "succeeded") return { ok: true, correlationId };
  if (!refund.refundId || !refund.paymentIntentId || !refund.amountCents || !refund.idempotencyKey) {
    return { ok: false, code: "EXTERNAL_FAILURE", correlationId };
  }
  try {
    const provider = await stripe.createFullRefund({
      paymentIntentId: refund.paymentIntentId,
      amountCents: refund.amountCents,
      idempotencyKey: refund.idempotencyKey,
    });
    await pool.query("SELECT record_stripe_refund_provider_result($1,$2,$3)", [refund.refundId, provider.id, provider.succeeded]);
  } catch (error) {
    const code = error instanceof Error ? error.name.slice(0, 80) : "provider_error";
    await pool.query("SELECT record_stripe_refund_provider_result($1,$2,$3,$4)", [refund.refundId, "failed:" + refund.idempotencyKey, false, code]);
    return { ok: false, code: "EXTERNAL_FAILURE", correlationId };
  }
  revalidatePath("/", "layout");
  return { ok: true, correlationId };
}
