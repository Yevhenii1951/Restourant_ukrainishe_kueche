import "server-only";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env/server";
import { getPublicMenu } from "@/features/menu/service";
import { createSupabaseQuoteStore } from "@/features/quote/supabaseQuoteStore";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderServiceDeps } from "./service";

let pool: Pool | null | undefined;

function getPool(): Pool | null {
  if (pool !== undefined) return pool;
  if (!serverEnv.DATABASE_URL) {
    pool = null;
    return pool;
  }
  const created = new Pool({ connectionString: serverEnv.DATABASE_URL, max: 5 });
  created.on("error", () => {});
  pool = created;
  return pool;
}

export function createOrderRuntime(): OrderServiceDeps | null {
  const dbPool = getPool();
  if (!dbPool || !serverEnv.QUOTE_SIGNING_SECRET) return null;
  return {
    pool: dbPool,
    secret: serverEnv.QUOTE_SIGNING_SECRET,
    store: createSupabaseQuoteStore(getSupabaseServerClient()),
    loadMenu: getPublicMenu,
  };
}