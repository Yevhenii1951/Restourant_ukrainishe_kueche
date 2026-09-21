import "server-only";
import { clientPublicEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";

export function isSupabaseStaffAuthConfigured(): boolean {
  return Boolean(
    clientPublicEnv.NEXT_PUBLIC_SUPABASE_URL &&
    clientPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    serverEnv.SUPABASE_URL &&
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}
