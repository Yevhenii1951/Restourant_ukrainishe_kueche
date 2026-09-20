import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { getReservationSlotsFromStore, type ReservationSlotsResult } from "./availability";
import type { AvailabilityRequest } from "./domain";
import { createSupabaseReservationStore } from "./supabaseReservationStore";

export function reservationStoreAvailable(): boolean {
  return Boolean(serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getReservationSlots(
  input: AvailabilityRequest,
  now?: Date,
): Promise<ReservationSlotsResult> {
  if (!reservationStoreAvailable()) {
    return { status: "error", reason: "service-unavailable" };
  }
  const store = createSupabaseReservationStore(getSupabaseServerClient());
  return getReservationSlotsFromStore(input, now ?? new Date(), { store });
}