import "server-only";
import { getPool } from "./runtime";
import { OrderStaffService } from "./staffService";
import { getCurrentStaff } from "@/features/identity/session";
import type {
  CsvExportResult,
  OrderDetailResult,
  OrderListResult,
  TransitionResult,
} from "./staffService";
import type { PickupAcceptingState } from "./domain";

export function staffOrderService(): Promise<OrderStaffService | null> {
  return getCurrentStaff().then((currentStaff) => {
    const pool = getPool();
    if (!pool || !currentStaff) return null;
    return new OrderStaffService({ pool, currentStaff, correlationId: crypto.randomUUID() });
  });
}

export async function staffListActiveOrders(): Promise<OrderListResult> {
  const service = await staffOrderService();
  if (!service) return { status: "error", reason: "service-unavailable" };
  return service.listActiveOrders();
}

export async function staffGetOrderDetail(orderId: string): Promise<OrderDetailResult> {
  const service = await staffOrderService();
  if (!service) return { status: "error", reason: "service-unavailable" };
  return service.getOrderDetail(orderId);
}

export async function staffGetPickupAccepting(): Promise<PickupAcceptingState> {
  const service = await staffOrderService();
  if (!service) return { enabled: true };
  return service.getPickupAccepting();
}

export async function staffExportOrdersCsv(): Promise<CsvExportResult> {
  const service = await staffOrderService();
  if (!service) return { status: "error", reason: "service-unavailable" };
  return service.exportOrdersCsv();
}

export async function staffTransitionOrder(input: unknown): Promise<TransitionResult> {
  const service = await staffOrderService();
  if (!service) return { status: "error", reason: "service-unavailable" };
  return service.transitionOrder(input);
}