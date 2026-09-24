"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCorrelationId } from "@/lib/correlationId";
import { getServerPool } from "@/lib/db/serverPool";
import { canManageReservations } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import type { ActionResult } from "@/features/identity/staffActions";
import { createDeliveryZone, createDeliveryWindow } from "./postgresDelivery";

const zoneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  postalCodes: z.string().trim().min(1),
  feeCents: z.coerce.number().int().min(0),
  minimumCents: z.coerce.number().int().min(0),
  freeDeliveryCents: z.coerce.number().int().min(0),
});

const windowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(200),
});

async function manager(): Promise<string | null> {
  const actor = await getCurrentStaff();
  if (!actor || !canManageReservations(actor)) return null;
  return actor.id;
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((fields, issue) => {
    const key = issue.path.join(".");
    (fields[key] ??= []).push(issue.message);
    return fields;
  }, {});
}

export async function saveDeliveryZoneAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const correlationId = createCorrelationId();
  const actorId = await manager();
  if (!actorId) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = zoneSchema.safeParse({
    name: formData.get("name"), postalCodes: formData.get("postalCodes"),
    feeCents: formData.get("feeCents"), minimumCents: formData.get("minimumCents"),
    freeDeliveryCents: formData.get("freeDeliveryCents"),
  });
  if (!parsed.success) return { ok: false, code: "VALIDATION_FAILED", fieldErrors: fieldErrors(parsed.error), correlationId };
  const postalCodes = [...new Set(parsed.data.postalCodes.split(/[\s,;]+/).filter(Boolean))];
  if (!postalCodes.every((code) => /^\d{5}$/.test(code))) {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: { postalCodes: ["PLZ muss genau fünf Ziffern haben."] }, correlationId };
  }
  const pool = getServerPool();
  if (!pool) return { ok: false, code: "CONFLICT", correlationId };
  const result = await createDeliveryZone(pool, {
    name: parsed.data.name, postalCodes,
    feeCents: parsed.data.feeCents, minimumCents: parsed.data.minimumCents,
    freeDeliveryCents: parsed.data.freeDeliveryCents,
  }, { actorId, correlationId });
  revalidatePath("/", "layout");
  return { ok: true, data: { id: result.id }, correlationId };
}

export async function saveDeliveryWindowAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const correlationId = createCorrelationId();
  const actorId = await manager();
  if (!actorId) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = windowSchema.safeParse({ weekday: formData.get("weekday"), opensAt: formData.get("opensAt"), closesAt: formData.get("closesAt"), capacity: formData.get("capacity") });
  if (!parsed.success || (parsed.success && parsed.data.closesAt <= parsed.data.opensAt)) {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: parsed.success ? { closesAt: ["Ende muss nach Beginn liegen."] } : fieldErrors(parsed.error), correlationId };
  }
  const pool = getServerPool();
  if (!pool) return { ok: false, code: "CONFLICT", correlationId };
  const result = await createDeliveryWindow(pool, {
    weekday: parsed.data.weekday, opensAt: parsed.data.opensAt,
    closesAt: parsed.data.closesAt, capacity: parsed.data.capacity,
  }, { actorId, correlationId });
  revalidatePath("/", "layout");
  return { ok: true, data: { id: result.id }, correlationId };
}
