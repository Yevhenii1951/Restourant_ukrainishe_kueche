import "server-only";
import { serverEnv } from "@/lib/env/server";
import { getPublicMenu } from "@/features/menu/service";
import { createSupabaseQuoteStore } from "@/features/quote/supabaseQuoteStore";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerPool } from "@/lib/db/serverPool";
import { createPostgresQuoteStore } from "@/features/quote/postgresQuoteStore";
import type { OrderServiceDeps } from "./service";

export { getServerPool as getPool } from "@/lib/db/serverPool";

export function createOrderRuntime(): OrderServiceDeps | null {
  const dbPool = getServerPool();
  if (!dbPool || !serverEnv.QUOTE_SIGNING_SECRET) return null;
  return {
    pool: dbPool,
    secret: serverEnv.QUOTE_SIGNING_SECRET,
    store: serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY ? createSupabaseQuoteStore(getSupabaseServerClient()) : createPostgresQuoteStore(dbPool),
    loadMenu: getPublicMenu,
  };
}
