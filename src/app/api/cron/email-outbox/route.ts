import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { getPool } from "@/features/order/runtime";
import { createBrevoAdapter } from "@/features/notifications/brevo";
import { deliverEmailOutbox } from "@/features/notifications/service";
export async function POST(request: Request): Promise<NextResponse> {
  if (!serverEnv.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + serverEnv.CRON_SECRET) return new NextResponse(null, { status: 401 });
  const pool = getPool(); if (!pool || !serverEnv.BREVO_API_KEY || !serverEnv.URL) return NextResponse.json({ status: "unavailable" }, { status: 503 });
  const delivered = await deliverEmailOutbox(pool, createBrevoAdapter(serverEnv.BREVO_API_KEY), serverEnv.URL); return NextResponse.json({ delivered });
}
