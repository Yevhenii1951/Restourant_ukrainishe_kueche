import "server-only";
import { getCurrentStaff } from "@/features/identity/session";
import { getReservationPool } from "./requestRuntime";
import { ReservationStaffService } from "./staffService";
import type { ReservationDetailResult, ReservationListResult } from "./staffService";

async function staffReservationService(): Promise<ReservationStaffService | null> {
  const [currentStaff, pool] = await Promise.all([getCurrentStaff(), getReservationPool()]);
  if (!currentStaff || !pool) return null;
  return new ReservationStaffService({ pool, currentStaff, correlationId: crypto.randomUUID() });
}

export async function staffListReservations(): Promise<ReservationListResult> {
  const service = await staffReservationService();
  if (!service) return { status: "error", reason: "service-unavailable" };
  return service.listReservations();
}

export async function staffGetReservationDetail(reservationId: string): Promise<ReservationDetailResult> {
  const service = await staffReservationService();
  if (!service) return { status: "error", reason: "service-unavailable" };
  return service.getReservationDetail(reservationId);
}
