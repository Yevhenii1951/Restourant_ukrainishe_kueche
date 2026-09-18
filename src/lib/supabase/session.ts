import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { clientPublicEnv } from "@/lib/env/client";

export async function createSupabaseSessionClient(): Promise<SupabaseClient> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    clientPublicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  }

  const cookieStore = await cookies();
  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => setCookies(cookieStore, cookiesToSet),
      },
    },
  );
}

type WritableCookieStore = Awaited<ReturnType<typeof cookies>>;

function setCookies(
  cookieStore: WritableCookieStore,
  cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
): void {
  for (const { name, value, options } of cookiesToSet) {
    cookieStore.set(name, value, options);
  }
}
