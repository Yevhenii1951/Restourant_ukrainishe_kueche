import { NextResponse } from "next/server";
import { deleteExpiredAiConversations } from "@/features/ai/history";
import { getServerPool } from "@/lib/db/serverPool";
import { serverEnv } from "@/lib/env/server";

export async function POST(request: Request): Promise<NextResponse> {
  if (
    !serverEnv.CRON_SECRET ||
    request.headers.get("authorization") !== "Bearer " + serverEnv.CRON_SECRET
  ) {
    return new NextResponse(null, { status: 401 });
  }
  const pool = getServerPool();
  if (!pool)
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  const deleted = await deleteExpiredAiConversations(pool);
  return NextResponse.json({ deleted });
}
