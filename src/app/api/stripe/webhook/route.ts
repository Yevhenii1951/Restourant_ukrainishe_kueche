import { NextResponse } from "next/server";
import { getPool } from "@/features/order/runtime";
import { constructStripeWebhookEvent, processStripeWebhookEvent } from "@/features/payments/webhook";
import { serverEnv } from "@/lib/env/server";

export async function POST(request: Request): Promise<NextResponse> {
  const pool = getPool();
  const signature = request.headers.get("stripe-signature");
  if (!pool || !signature || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }

  const rawBody = await request.text();
  try {
    const event = constructStripeWebhookEvent(rawBody, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
    const result = await processStripeWebhookEvent(event, pool);
    if (result === "mismatch" || result === "not-bound" || result === "invalid") {
      return NextResponse.json({ status: result }, { status: 400 });
    }
    return NextResponse.json({ status: result });
  } catch {
    return NextResponse.json({ status: "invalid-signature" }, { status: 400 });
  }
}
