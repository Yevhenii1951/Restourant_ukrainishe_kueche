import "server-only";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env/server";
import { createSupabaseReservationStore } from "./supabaseReservationStore";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ReservationRequestServiceDeps } from "./requestService";

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

export function createReservationRequestRuntime(): ReservationRequestServiceDeps | null {
  const dbPool = getPool();
  if (!dbPool || !serverEnv.QUOTE_SIGNING_SECRET) return null;
  return {
    pool: dbPool,
    secret: serverEnv.QUOTE_SIGNING_SECRET,
    store: createSupabaseReservationStore(getSupabaseServerClient()),
  };
}