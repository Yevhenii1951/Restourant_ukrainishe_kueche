"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createCorrelationId } from "@/lib/correlationId";
import { canManageContent, type StaffContext } from "@/features/identity/domain";
import type { ActionResult } from "@/features/identity/staffActions";
import { getCurrentStaff } from "@/features/identity/session";
import { CONTENT_KEY, CONTENT_SCHEMAS, type ContentKey } from "./domain";
import { createSupabaseContentStore } from "./supabaseContentStore";
import { createPostgresContentStore } from "./postgresContentStore";
import { getServerPool } from "@/lib/db/serverPool";

type ContentResult = { typedKey: ContentKey; version: number };

const contentActionInputSchema = z.object({
  typedKey: CONTENT_KEY,
  version: z.coerce.number().int().positive(),
});

function parseCommonInput(formData: FormData) {
  return contentActionInputSchema.safeParse({
    typedKey: formData.get("typedKey"),
    version: formData.get("version"),
  });
}

function requireManager(actor: StaffContext | null): boolean {
  return actor !== null && canManageContent(actor);
}

function contentStore() {
  const pool = getServerPool();
  return pool
    ? createPostgresContentStore(pool)
    : createSupabaseContentStore(getSupabaseServerClient());
}

export async function saveContentAction(
  formData: FormData,
): Promise<ActionResult<ContentResult>> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };
  if (!requireManager(actor)) {
    return { ok: false, code: "FORBIDDEN", correlationId };
  }

  const parsedInput = parseCommonInput(formData);
  if (!parsedInput.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(parsedInput.error),
      correlationId,
    };
  }

  const payloadText = formData.get("payload");
  if (typeof payloadText !== "string" || payloadText.trim() === "") {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: { payload: ["Payload ist leer."] },
      correlationId,
    };
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadText);
  } catch {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: { payload: ["Payload ist kein gültiges JSON."] },
      correlationId,
    };
  }

  const typedPayload = CONTENT_SCHEMAS[parsedInput.data.typedKey].safeParse(parsedPayload);
  if (!typedPayload.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(typedPayload.error),
      correlationId,
    };
  }

  const store = contentStore();
  const result = await store.save({
    typedKey: parsedInput.data.typedKey,
    version: parsedInput.data.version,
    payload: typedPayload.data,
    updatedBy: actor.id,
  });
  if (!result.ok) return { ok: false, code: "CONFLICT", correlationId };
  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { typedKey: parsedInput.data.typedKey, version: result.version },
    correlationId,
  };
}

export async function publishContentAction(
  formData: FormData,
): Promise<ActionResult<ContentResult>> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };
  if (!requireManager(actor)) {
    return { ok: false, code: "FORBIDDEN", correlationId };
  }

  const parsedInput = parseCommonInput(formData);
  if (!parsedInput.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(parsedInput.error),
      correlationId,
    };
  }

  const store = contentStore();
  const result = await store
    .publish({
      typedKey: parsedInput.data.typedKey,
      version: parsedInput.data.version,
      updatedBy: actor.id,
    });
  if (!result.ok) return { ok: false, code: "CONFLICT", correlationId };
  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { typedKey: parsedInput.data.typedKey, version: result.version },
    correlationId,
  };
}

export async function archiveContentAction(
  formData: FormData,
): Promise<ActionResult<ContentResult>> {
  const correlationId = createCorrelationId();
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId };
  if (!requireManager(actor)) {
    return { ok: false, code: "FORBIDDEN", correlationId };
  }

  const parsedInput = parseCommonInput(formData);
  if (!parsedInput.success) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: flattenFieldErrors(parsedInput.error),
      correlationId,
    };
  }

  const store = contentStore();
  const result = await store
    .archive({
      typedKey: parsedInput.data.typedKey,
      version: parsedInput.data.version,
      updatedBy: actor.id,
    });
  if (!result.ok) return { ok: false, code: "CONFLICT", correlationId };
  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { typedKey: parsedInput.data.typedKey, version: result.version },
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