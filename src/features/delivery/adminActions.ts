"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCorrelationId } from "@/lib/correlationId";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { canManageReservations } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import type { ActionResult } from "@/features/identity/staffActions";

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
  const db = getSupabaseServerClient();
  const result = await db.from("delivery_zones").insert({
    name: parsed.data.name, postal_codes: postalCodes, fee_cents: parsed.data.feeCents,
    minimum_cents: parsed.data.minimumCents, free_delivery_cents: parsed.data.freeDeliveryCents, active: true,
  }).select("id").single();
  if (result.error || !result.data) return { ok: false, code: "CONFLICT", correlationId };
  await db.from("audit_events").insert({ actor_id: actorId, action: "delivery.zone.create", entity_type: "delivery_zone", entity_id: result.data.id, after_data: { ...parsed.data, postalCodes }, correlation_id: correlationId });
  revalidatePath("/", "layout");
  return { ok: true, data: { id: result.data.id }, correlationId };
}

export async function saveDeliveryWindowAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const correlationId = createCorrelationId();
  const actorId = await manager();
  if (!actorId) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = windowSchema.safeParse({ weekday: formData.get("weekday"), opensAt: formData.get("opensAt"), closesAt: formData.get("closesAt"), capacity: formData.get("capacity") });
  if (!parsed.success || (parsed.success && parsed.data.closesAt <= parsed.data.opensAt)) {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: parsed.success ? { closesAt: ["Ende muss nach Beginn liegen."] } : fieldErrors(parsed.error), correlationId };
  }
  const db = getSupabaseServerClient();
  const result = await db.from("service_windows").insert({ fulfilment: "delivery", weekday: parsed.data.weekday, opens_at: parsed.data.opensAt, closes_at: parsed.data.closesAt, capacity_per_slot: parsed.data.capacity, active: true }).select("id").single();
  if (result.error || !result.data) return { ok: false, code: "CONFLICT", correlationId };
  await db.from("audit_events").insert({ actor_id: actorId, action: "delivery.window.create", entity_type: "service_window", entity_id: result.data.id, after_data: parsed.data, correlation_id: correlationId });
  revalidatePath("/", "layout");
  return { ok: true, data: { id: result.data.id }, correlationId };
}
