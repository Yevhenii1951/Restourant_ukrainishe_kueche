import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { createSupabaseContentStore } from "./supabaseContentStore";
import { type PublicContentEntryRow } from "./store";
import { type PublicContentEntry } from "./public";

export async function getPublicContentEntries(): Promise<PublicContentEntry[]> {
  if (serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    const rows = await createSupabaseContentStore(
      getSupabaseServerClient(),
    ).listPublished();
    return rows.map(toPublicEntry);
  }
  return [];
}

function toPublicEntry(row: PublicContentEntryRow): PublicContentEntry {
  return {
    id: row.id,
    typedKey: row.typed_key,
    payload: row.payload,
    publishedAt: row.published_at,
  };
}