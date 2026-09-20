"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCorrelationId } from "@/lib/correlationId";
import { canManageReservations } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
const closureSchema = z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime(), services: z.array(z.enum(["pickup", "delivery", "reservation"])).min(1) });
export async function createClosureAction(input: unknown): Promise<{ ok: boolean; code?: string }> {
  const actor = await getCurrentStaff(); if (!actor || !canManageReservations(actor)) return { ok: false, code: "FORBIDDEN" };
  const parsed = closureSchema.safeParse(input); if (!parsed.success || Date.parse(parsed.data.endsAt) <= Date.parse(parsed.data.startsAt)) return { ok: false, code: "VALIDATION_FAILED" };
  const correlationId = createCorrelationId(); const db = getSupabaseServerClient();
  const result = await db.from("closures").insert({ starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, affected_services: parsed.data.services }).select("id").single();
  if (result.error || !result.data) return { ok: false, code: "CONFLICT" };
  await db.from("audit_events").insert({ actor_id: actor.id, action: "operations.closure.create", entity_type: "closure", entity_id: result.data.id, after_data: { startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt, services: parsed.data.services }, correlation_id: correlationId });
  revalidatePath("/", "layout"); return { ok: true };
}
