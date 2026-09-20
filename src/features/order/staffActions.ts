"use server";

import { createCorrelationId } from "@/lib/correlationId";
import { getPool } from "./runtime";
import { getCurrentStaff } from "@/features/identity/session";
import { OrderStaffService } from "./staffService";
import {
  canManageOrders,
  canExportCustomerData,
  type StaffContext,
} from "@/features/identity/domain";

export type OrderActionResult<T> =
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
        | "EXTERNAL_FAILURE";
      fieldErrors?: Record<string, string[]>;
      correlationId: string;
    };

async function buildService(
  actor: StaffContext,
): Promise<{ service: OrderStaffService; correlationId: string } | OrderActionResult<never>> {
  const correlationId = createCorrelationId();
  const pool = getPool();
  if (!pool || !actor) return { ok: false, code: "UNAUTHORIZED", correlationId };
  if (!canManageOrders(actor)) return { ok: false, code: "FORBIDDEN", correlationId };
  return { service: new OrderStaffService({ pool, currentStaff: actor, correlationId }), correlationId };
}

export async function transitionOrderAction(
  input: unknown,
): Promise<OrderActionResult<import("./domain").AppliedTransitionProjection>> {
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId: createCorrelationId() };
  const built = await buildService(actor);
  if (!("service" in built)) return built;

  const result = await built.service.transitionOrder(input);
  if (result.status === "validation-failed") {
    return { ok: false, code: "VALIDATION_FAILED", fieldErrors: result.fieldErrors, correlationId: built.correlationId };
  }
  if (result.status === "forbidden") {
    return { ok: false, code: "FORBIDDEN", correlationId: built.correlationId };
  }
  if (result.status === "not-found") {
    return { ok: false, code: "NOT_FOUND", correlationId: built.correlationId };
  }
  if (result.status === "conflict") {
    return { ok: false, code: "CONFLICT", correlationId: built.correlationId };
  }
  if (result.status === "illegal-transition") {
    return { ok: false, code: "INVALID_STATE_TRANSITION", correlationId: built.correlationId };
  }
  if (result.status === "error") {
    return { ok: false, code: "EXTERNAL_FAILURE", correlationId: built.correlationId };
  }
  return { ok: true, data: result.applied, correlationId: built.correlationId };
}

export async function setPickupAcceptingAction(
  enabled: boolean,
): Promise<OrderActionResult<import("./domain").PickupAcceptingState>> {
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId: createCorrelationId() };
  const built = await buildService(actor);
  if (!("service" in built)) return built;

  const result = await built.service.setPickupAccepting(enabled);
  if (result.status === "error") {
    return { ok: false, code: "EXTERNAL_FAILURE", correlationId: built.correlationId };
  }
  return { ok: true, data: result.accepting, correlationId: built.correlationId };
}

export async function exportOrdersCsvAction(): Promise<
  OrderActionResult<{ csv: string }>
> {
  const actor = await getCurrentStaff();
  if (!actor) return { ok: false, code: "UNAUTHORIZED", correlationId: createCorrelationId() };
  if (!canExportCustomerData(actor)) {
    return { ok: false, code: "FORBIDDEN", correlationId: createCorrelationId() };
  }
  const correlationId = createCorrelationId();
  const pool = getPool();
  if (!pool) return { ok: false, code: "EXTERNAL_FAILURE", correlationId };
  const service = new OrderStaffService({ pool, currentStaff: actor, correlationId });
  const result = await service.exportOrdersCsv();
  if (result.status === "error") {
    return { ok: false, code: "EXTERNAL_FAILURE", correlationId };
  }
  return { ok: true, data: { csv: result.csv }, correlationId };
}