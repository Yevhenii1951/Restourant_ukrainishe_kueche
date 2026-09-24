"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerPool } from "@/lib/db/serverPool";
import { createCorrelationId } from "@/lib/correlationId";
import {
  assertCanManageStaff,
  STAFF_ROLES,
  StaffDeniedError,
  type StaffRole,
} from "./domain";
import { StaffService } from "./service";
import type { StaffInvitation } from "./store";
import { createSupabaseStaffStore } from "./supabaseStaffStore";
import { createPostgresStaffStore } from "./postgresStaffStore";
import { getCurrentStaff } from "./session";

export type ActionResult<T> =
  | { ok: true; data: T; correlationId: string }
  | {
      ok: false;
      code:
        | "VALIDATION_FAILED"
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "CONFLICT"
        | "EXTERNAL_FAILURE";
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

  const store = resolveStaffStore();
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

  const store = resolveStaffStore();
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

const inviteStaffSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(STAFF_ROLES),
});

export async function inviteStaffAction(
  input: z.input<typeof inviteStaffSchema>,
): Promise<ActionResult<{ invitationId: string }>> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };
  try {
    assertCanManageStaff(actor);
  } catch (error) {
    if (error instanceof StaffDeniedError) {
      return { ok: false, code: "FORBIDDEN", correlationId };
    }
    throw error;
  }

  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(parsed.error),
      correlationId,
    };
  }

  const client = getSupabaseServerClient();
  const { data, error } = await client.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { display_name: parsed.data.displayName },
    },
  );
  if (error || !data.user) {
    return { ok: false, code: "EXTERNAL_FAILURE", correlationId };
  }

  const invitation: StaffInvitation = {
    id: randomUUID(),
    authUserId: data.user.id,
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    role: parsed.data.role,
    tokenHash: null,
    expiresAt: null,
    acceptedAt: null,
    inviterId: actor.id,
  };
  const service = new StaffService(
    resolveStaffStore(),
    correlationId,
  );
  try {
    const decision = await service.invite(actor, invitation);
    if (!decision.ok) {
      await client.auth.admin.deleteUser(data.user.id);
      return { ok: false, code: decision.code, correlationId };
    }
  } catch (storeError) {
    const { error: cleanupError } = await client.auth.admin.deleteUser(
      data.user.id,
    );
    if (cleanupError)
      throw new AggregateError(
        [storeError, cleanupError],
        "Invitation rollback failed",
      );
    throw storeError;
  }
  return { ok: true, data: { invitationId: invitation.id }, correlationId };
}

function resolveStaffStore() {
  const pool = getServerPool();
  return pool
    ? createPostgresStaffStore(pool)
    : createSupabaseStaffStore(getSupabaseServerClient());
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
