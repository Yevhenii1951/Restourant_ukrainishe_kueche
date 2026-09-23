import "server-only";
import { getReservationSlotsFromStore, type ReservationSlotsResult } from "./availability";
import type { AvailabilityRequest } from "./domain";
import { createPostgresReservationStore } from "./postgresReservationStore";
import { getServerPool } from "@/lib/db/serverPool";

export function reservationStoreAvailable(): boolean {
  return Boolean(getServerPool());
}

export async function getReservationSlots(
  input: AvailabilityRequest,
  now?: Date,
): Promise<ReservationSlotsResult> {
  const pool = getServerPool();
  if (!pool) {
    return { status: "error", reason: "service-unavailable" };
  }
  return getReservationSlotsFromStore(input, now ?? new Date(), {
    store: createPostgresReservationStore(pool),
  });
}
