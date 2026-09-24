import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { clientPublicEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";
import { getServerPool } from "@/lib/db/serverPool";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { type StaffContext } from "./domain";
import { createSupabaseStaffStore } from "./supabaseStaffStore";
import { createPostgresStaffStore } from "./postgresStaffStore";
import { resolveCurrentStaff } from "./service";

export async function getCurrentStaff(): Promise<StaffContext | null> {
  if (
    !clientPublicEnv.NEXT_PUBLIC_SUPABASE_URL ||
    !clientPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !serverEnv.SUPABASE_URL ||
    !serverEnv.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  const sessionClient = await createSupabaseSessionClient();
  const { data, error } = await sessionClient.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const { data: userData, error: userError } =
    await sessionClient.auth.getUser();
  if (userError || !userData.user?.email_confirmed_at) return null;
  if (userData.user.id !== data.claims.sub) return null;

  const pool = getServerPool();
  const store = pool
    ? createPostgresStaffStore(pool)
    : createSupabaseStaffStore(getSupabaseServerClient());
  return resolveCurrentStaff(data.claims.sub, store);
}
