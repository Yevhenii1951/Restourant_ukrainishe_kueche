import "server-only";
import { getPublicMenu } from "@/features/menu/service";
import { createSupabaseQuoteStore } from "@/features/quote/supabaseQuoteStore";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
    store: serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY ? createSupabaseQuoteStore(getSupabaseServerClient()) : createPostgresQuoteStore(pool),
    loadMenu: getPublicMenu,
  };
}
