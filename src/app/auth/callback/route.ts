import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { normalizeAuthNextPath } from "@/features/identity/authPaths";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath =
    normalizeAuthNextPath(url.searchParams.get("next")) ?? "/de/admin";
  const redirectUrl = new URL(nextPath, url.origin);

  if (!code) {
    redirectUrl.pathname = "/de/admin/login";
    redirectUrl.searchParams.set("error", "missing-code");
    return NextResponse.redirect(redirectUrl);
  }

  const client = await createSupabaseSessionClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    redirectUrl.pathname = "/de/admin/login";
    redirectUrl.searchParams.set("error", "invalid-code");
  }

  return NextResponse.redirect(redirectUrl);
}
