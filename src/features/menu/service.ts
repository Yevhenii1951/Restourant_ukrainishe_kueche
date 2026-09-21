import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import type { PublicMenu, SupportedLocale } from "./domain";
import { createSupabaseMenuStore } from "./supabaseMenuStore";
import { createPostgresMenuStore } from "./postgresMenuStore";
import { getServerPool } from "@/lib/db/serverPool";

const EMPTY_MENU: PublicMenu = { items: [], allergenReference: [], additiveReference: [] };

export async function getPublicMenu(
  locale: SupportedLocale,
): Promise<PublicMenu> {
  if (serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseMenuStore(getSupabaseServerClient()).listPublicMenu(locale);
  }
  const pool = getServerPool();
  if (pool) return createPostgresMenuStore(pool).listPublicMenu(locale);
  return EMPTY_MENU;
}
