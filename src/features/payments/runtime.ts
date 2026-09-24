import "server-only";
import { getPublicMenu } from "@/features/menu/service";
import { serverEnv } from "@/lib/env/server";
import { createPostgresQuoteStore } from "@/features/quote/postgresQuoteStore";
import { getPool } from "@/features/order/runtime";
import { createStripeCheckoutClient } from "./stripeClient";
import type { StripeCheckoutDeps } from "./checkout";

export function createStripeCheckoutRuntime(): StripeCheckoutDeps | null {
  const pool = getPool();
  const stripe = createStripeCheckoutClient();
  if (!pool || !stripe || !serverEnv.QUOTE_SIGNING_SECRET || !serverEnv.URL) return null;
  return {
    pool,
    stripe,
    baseUrl: serverEnv.URL,
    secret: serverEnv.QUOTE_SIGNING_SECRET,
    paypalEnabled: serverEnv.STRIPE_PAYPAL_ENABLED === "true",
    store: createPostgresQuoteStore(pool),
    loadMenu: getPublicMenu,
  };
}
