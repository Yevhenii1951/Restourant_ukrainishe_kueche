"use server";

import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createCorrelationId } from "@/lib/correlationId";
import { STAFF_ROLES, type StaffRole } from "./domain";
import { StaffService } from "./service";
import { createQueryableSupabaseStaffStore } from "./supabaseStaffStore";
import { getCurrentStaff } from "./session";

export type ActionResult<T> =
  | { ok: true; data: T; correlationId: string }
  | {
      ok: false;
      code: "VALIDATION_FAILED" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT";
      fieldErrors?: Record<string, string[]>;
      correlationId: string;
    };

const changeRoleSchema = z.object({
  targetId: z.string().uuid(),
  newRole: z.enum(STAFF_ROLES),
});

export async function changeStaffRoleAction(
  targetId: string,
  newRole: StaffRole,
): Promise<ActionResult<{ id: string; role: StaffRole }>> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };

  const parsed = changeRoleSchema.safeParse({ targetId, newRole });
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(parsed.error),
      correlationId,
    };
  }

  const client = getSupabaseServerClient();
  const store = createQueryableSupabaseStaffStore(client);
  const decision = await new StaffService(store, correlationId).changeRole(
    actor,
    parsed.data.targetId,
    parsed.data.newRole,
  );
  if (!decision.ok) return { ok: false, code: decision.code, correlationId };
  return {
    ok: true,
    data: { id: parsed.data.targetId, role: parsed.data.newRole },
    correlationId,
  };
}

const deactivateSchema = z.object({
  targetId: z.string().uuid(),
  active: z.boolean(),
});

export async function setStaffActiveAction(
  targetId: string,
  active: boolean,
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };

  const parsed = deactivateSchema.safeParse({ targetId, active });
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(parsed.error),
      correlationId,
    };
  }

  const client = getSupabaseServerClient();
  const store = createQueryableSupabaseStaffStore(client);
  const decision = await new StaffService(store, correlationId).setActiveStatus(
    actor,
    parsed.data.targetId,
    parsed.data.active,
  );
  if (!decision.ok) return { ok: false, code: decision.code, correlationId };
  return {
    ok: true,
    data: { id: parsed.data.targetId, active: parsed.data.active },
    correlationId,
  };
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
