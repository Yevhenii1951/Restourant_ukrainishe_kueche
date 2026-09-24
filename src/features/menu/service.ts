import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { isDemoContentMode } from "@/lib/env/demoMode";
import type { PublicMenu, SupportedLocale } from "./domain";
import { getDemoPublicMenu, withDemoMenuFallback } from "./demoMenu";
import { createSupabaseMenuStore } from "./supabaseMenuStore";
import { createPostgresMenuStore } from "./postgresMenuStore";
import { getServerPool } from "@/lib/db/serverPool";

export async function getPublicMenu(
  locale: SupportedLocale,
): Promise<PublicMenu> {
  if (isDemoContentMode()) return getDemoPublicMenu();
  try {
    if (serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
      return withDemoMenuFallback(
        await createSupabaseMenuStore(getSupabaseServerClient()).listPublicMenu(
          locale,
        ),
      );
    }
    const pool = getServerPool();
    if (pool)
      return withDemoMenuFallback(
        await createPostgresMenuStore(pool).listPublicMenu(locale),
      );
  } catch {
    return withDemoMenuFallback(
      getDemoPublicMenu(),
    );
  }
  return getDemoPublicMenu();
}