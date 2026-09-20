"use server";
import { revalidatePath } from "next/cache";
import { createCorrelationId } from "@/lib/correlationId";
import { getCurrentStaff } from "@/features/identity/session";
import { getReservationPool } from "@/features/reservation/requestRuntime";
import { transitionCateringInquiry } from "./staff";
export async function transitionCateringInquiryAction(input: unknown): Promise<{ ok: boolean; code?: string }> {
  const [actor, pool] = await Promise.all([getCurrentStaff(), getReservationPool()]);
  if (!actor || !pool) return { ok: false, code: "UNAVAILABLE" };
  const outcome = await transitionCateringInquiry(pool, actor, createCorrelationId(), input);
  if (outcome !== "applied") return { ok: false, code: outcome === "forbidden" ? "FORBIDDEN" : outcome === "conflict" ? "CONFLICT" : "INVALID_STATE_TRANSITION" };
  revalidatePath("/", "layout"); return { ok: true };
}
