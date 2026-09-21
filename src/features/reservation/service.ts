import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { getReservationSlotsFromStore, type ReservationSlotsResult } from "./availability";
import type { AvailabilityRequest } from "./domain";
import { createSupabaseReservationStore } from "./supabaseReservationStore";
import { createPostgresReservationStore } from "./postgresReservationStore";
import { getServerPool } from "@/lib/db/serverPool";

export function reservationStoreAvailable(): boolean {
  return Boolean((serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY) || getServerPool());
}

export async function getReservationSlots(
  input: AvailabilityRequest,
  now?: Date,
): Promise<ReservationSlotsResult> {
  if (!reservationStoreAvailable()) {
    return { status: "error", reason: "service-unavailable" };
  }
  const store = serverEnv.SUPABASE_URL && serverEnv.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseReservationStore(getSupabaseServerClient())
    : createPostgresReservationStore(getServerPool()!);
  return getReservationSlotsFromStore(input, now ?? new Date(), { store });
}
