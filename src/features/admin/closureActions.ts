"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCorrelationId } from "@/lib/correlationId";
import { canManageReservations } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import { getServerPool } from "@/lib/db/serverPool";
import { createClosure } from "./postgresClosures";
const closureSchema = z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime(), services: z.array(z.enum(["pickup", "delivery", "reservation"])).min(1) });
export async function createClosureAction(input: unknown): Promise<{ ok: boolean; code?: string }> {
  const actor = await getCurrentStaff(); if (!actor || !canManageReservations(actor)) return { ok: false, code: "FORBIDDEN" };
  const parsed = closureSchema.safeParse(input); if (!parsed.success || Date.parse(parsed.data.endsAt) <= Date.parse(parsed.data.startsAt)) return { ok: false, code: "VALIDATION_FAILED" };
  const pool = getServerPool();
  if (!pool) return { ok: false, code: "CONFLICT" };
  const correlationId = createCorrelationId();
  const result = await createClosure(pool, { startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt, services: parsed.data.services }, { actorId: actor.id, correlationId });
  if (!result) return { ok: false, code: "CONFLICT" };
  revalidatePath("/", "layout"); return { ok: true };
}
