"use server";

import { createCorrelationId } from "@/lib/correlationId";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { canManageReservations } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import type { ActionResult } from "@/features/identity/staffActions";
import { getReservationPool } from "./requestRuntime";
import { combinationDraftSchema, validateCombination } from "./domain";
import { createSupabaseReservationStore } from "./supabaseReservationStore";
import { ReservationStaffService } from "./staffService";
import type { ReservationTransitionResult } from "./staffService";
const tableActionSchema = z.object({
  id: z.string().uuid().nullish(),
  internalLabel: z.string().trim().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(200),
  area: z.string().trim().min(1).max(40),
});

const idSchema = z.object({
  id: z.string().uuid(),
  active: z.enum(["on", "off"]),
});

type TableResult = { id: string };
type CombinationResult = { id: string };

async function requireReservationManager() {
  const actor = await getCurrentStaff();
  if (!actor) return { actor: null as null };
  if (!canManageReservations(actor)) return { actor: null as null };
  return { actor };
}

async function writeAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  afterData: Record<string, unknown>,
  correlationId: string,
): Promise<void> {
  await getSupabaseServerClient().from("audit_events").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    after_data: afterData,
    correlation_id: correlationId,
  });
}

export type ReservationActionResult<T> =
  | { ok: true; data: T; correlationId: string }
  | {
      ok: false;
      code:
        | "VALIDATION_FAILED"
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "CONFLICT"
        | "INVALID_STATE_TRANSITION"
        | "NO_TABLE_AVAILABLE"
        | "EXTERNAL_FAILURE";
      fieldErrors?: Record<string, string[]>;
      correlationId: string;
    };

export async function saveTableAction(
  formData: FormData,
): Promise<ActionResult<TableResult>> {
  const correlationId = createCorrelationId();
  const { actor } = await requireReservationManager();
  if (!actor) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = tableActionSchema.safeParse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    internalLabel: formData.get("internalLabel"),
    capacity: formData.get("capacity"),
    area: formData.get("area"),
  });
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: flattenFieldErrors(parsed.error), correlationId };
  }
  const store = createSupabaseReservationStore(getSupabaseServerClient());
  try {
    const table = await store.saveTable({ ...parsed.data, id: parsed.data.id ?? undefined, active: true });
    await writeAudit(actor.id, parsed.data.id ? "reservation.table.update" : "reservation.table.create", "restaurant_table", table.id, { internalLabel: table.internalLabel, capacity: table.capacity, area: table.area }, correlationId);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: table.id }, correlationId };
  } catch {
    return { ok: false, code: "CONFLICT", correlationId };
  }
}

export async function setTableActiveAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const correlationId = createCorrelationId();
  const { actor } = await requireReservationManager();
  if (!actor) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = idSchema.safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { ok: false, code: "VALIDATION_FAILED", correlationId };
  const store = createSupabaseReservationStore(getSupabaseServerClient());
  try {
    const current = (await store.listTables()).find((table) => table.id === parsed.data.id);
    if (!current) return { ok: false, code: "CONFLICT", correlationId };
    await store.saveTable({ ...current, active: parsed.data.active === "on" });
    await writeAudit(actor.id, "reservation.table.toggle", "restaurant_table", current.id, { active: parsed.data.active === "on" }, correlationId);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: current.id }, correlationId };
  } catch {
    return { ok: false, code: "CONFLICT", correlationId };
  }
}

export async function saveCombinationAction(
  formData: FormData,
): Promise<ActionResult<CombinationResult>> {
  const correlationId = createCorrelationId();
  const { actor } = await requireReservationManager();
  if (!actor) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = combinationDraftSchema.safeParse({ name: formData.get("name"), memberTableIds: formData.getAll("memberTableIds").map(String) });
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: flattenFieldErrors(parsed.error), correlationId };
  }
  const store = createSupabaseReservationStore(getSupabaseServerClient());
  const validation = validateCombination(parsed.data, await store.listTables());
  if (!validation.ok) {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: { memberTableIds: validation.errors ?? [] }, correlationId };
  }
  const idFromForm = formData.get("id") ? String(formData.get("id")) : undefined;
  try {
    const combination = await store.saveCombination({ id: idFromForm, name: parsed.data.name, active: true, memberTableIds: [...new Set(parsed.data.memberTableIds)] });
    await writeAudit(actor.id, idFromForm ? "reservation.combination.update" : "reservation.combination.create", "table_combination", combination.id, { name: combination.name, capacity: combination.capacity, memberTableIds: combination.memberTableIds }, correlationId);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: combination.id }, correlationId };
  } catch {
    return { ok: false, code: "CONFLICT", correlationId };
  }
}

export async function setCombinationActiveAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const correlationId = createCorrelationId();
  const { actor } = await requireReservationManager();
  if (!actor) return { ok: false, code: "FORBIDDEN", correlationId };
  const parsed = idSchema.safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { ok: false, code: "VALIDATION_FAILED", correlationId };
  const store = createSupabaseReservationStore(getSupabaseServerClient());
  try {
    const current = (await store.listCombinations()).find((item) => item.id === parsed.data.id);
    if (!current) return { ok: false, code: "CONFLICT", correlationId };
    await store.saveCombination({ id: current.id, name: current.name, active: parsed.data.active === "on", memberTableIds: current.memberTableIds });
    await writeAudit(actor.id, "reservation.combination.toggle", "table_combination", current.id, { active: parsed.data.active === "on" }, correlationId);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: current.id }, correlationId };
  } catch {
    return { ok: false, code: "CONFLICT", correlationId };
  }
}

export async function transitionReservationAction(
  input: unknown,
): Promise<ReservationActionResult<Extract<ReservationTransitionResult, { status: "applied" }>>> {
  const correlationId = createCorrelationId();
  const [actor, pool] = await Promise.all([getCurrentStaff(), getReservationPool()]);
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };
  if (!pool) return { ok: false, code: "EXTERNAL_FAILURE", correlationId };

  const service = new ReservationStaffService({ pool, currentStaff: actor, correlationId });
  const result = await service.transitionReservation(input);
  if (result.status === "validation-failed") {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: result.fieldErrors, correlationId };
  }
  if (result.status === "forbidden") return { ok: false, code: "FORBIDDEN", correlationId };
  if (result.status === "not-found") return { ok: false, code: "NOT_FOUND", correlationId };
  if (result.status === "conflict") return { ok: false, code: "CONFLICT", correlationId };
  if (result.status === "illegal-transition") {
    return { ok: false, code: "INVALID_STATE_TRANSITION", correlationId };
  }
  if (result.status === "no-table-available") {
    return { ok: false, code: "NO_TABLE_AVAILABLE", correlationId };
  }
  if (result.status === "error") return { ok: false, code: "EXTERNAL_FAILURE", correlationId };
  return { ok: true, data: result, correlationId };
}

function flattenFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}
