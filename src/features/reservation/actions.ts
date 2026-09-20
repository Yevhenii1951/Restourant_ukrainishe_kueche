"use server";

import { availabilityRequestSchema } from "./domain";
import { getReservationSlots } from "./service";
import type { ReservationSlotsResult } from "./availability";

export async function requestReservationSlotsAction(
  raw: unknown,
): Promise<ReservationSlotsResult> {
  const parsed = availabilityRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", reason: "service-unavailable" };
  }
  return getReservationSlots(parsed.data);
}