"use server";
import { headers } from "next/headers";
import { createCorrelationId } from "@/lib/correlationId";
import { getReservationPool } from "@/features/reservation/requestRuntime";
import { createCateringInquiry } from "./service";
import type { CateringInquiryResult } from "./domain";
export async function submitCateringInquiryAction(input: unknown): Promise<CateringInquiryResult & { correlationId: string }> {
  const correlationId = createCorrelationId();
  const pool = getReservationPool();
  if (!pool) return { status: "error", correlationId };
  const requestHeaders = await headers();
  const sourceKey = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  return { ...(await createCateringInquiry(input, { pool, sourceKey })), correlationId };
}
