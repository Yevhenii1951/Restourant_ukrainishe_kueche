import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { isDemoContentMode } from "@/lib/env/demoMode";
import { createSupabaseContentStore } from "./supabaseContentStore";
import { type PublicContentEntryRow } from "./store";
import { type PublicContentEntry } from "./public";
import { createPostgresContentStore } from "./postgresContentStore";
import {
  getDemoPublicContentEntries,
  withDemoContentFallback,
} from "./demoContent";
import { getServerPool } from "@/lib/db/serverPool";

export async function getPublicContentEntries(): Promise<PublicContentEntry[]> {
  if (isDemoContentMode()) return getDemoPublicContentEntries();
  if (serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    const rows = await createSupabaseContentStore(
      getSupabaseServerClient(),
    ).listPublished();
    return withDemoContentFallback(rows.map(toPublicEntry));
  }
  const pool = getServerPool();
  if (pool) {
    const entries = (
      await createPostgresContentStore(pool).listPublished()
    ).map(toPublicEntry);
    return withDemoContentFallback(entries);
  }
  return getDemoPublicContentEntries();
}

function toPublicEntry(row: PublicContentEntryRow): PublicContentEntry {
  return {
    id: row.id,
    typedKey: row.typed_key,
    payload: row.payload,
    publishedAt: row.published_at,
  };
}
