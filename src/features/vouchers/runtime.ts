import "server-only";
import { serverEnv } from "@/lib/env/server";
import { getPool } from "@/features/order/runtime";
import { createStripeCheckoutClient } from "@/features/payments/stripeClient";
import type { VoucherDeps } from "./service";

export function createVoucherRuntime(): VoucherDeps | null {
  const pool = getPool();
  const stripe = createStripeCheckoutClient();
  if (!pool || !stripe || !serverEnv.URL) return null;
  return {
    pool,
    stripe,
    baseUrl: serverEnv.URL,
    paypalEnabled: serverEnv.STRIPE_PAYPAL_ENABLED === "true",
  };
}
