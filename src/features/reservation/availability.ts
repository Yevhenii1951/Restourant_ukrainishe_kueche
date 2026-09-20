import { berlinDateKey } from "@/features/quote/slots";
import {
  buildAllocationOptions,
  type AllocationOption,
  type AvailabilityRequest,
} from "./domain";
import { buildReservationSlots } from "./slots";
import type { ReservationStore } from "./store";

export type ReservationReadStore = Pick<
  ReservationStore,
  | "getReservationConfig"
  | "listTables"
  | "listCombinations"
  | "listReservationWindows"
  | "listReservationClosures"
  | "listReservationBlocks"
>;

export type ReservationSlotsResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "slots"; slots: import("./domain").ReservationSlot[] }
  | { status: "rejected"; reason: "date-in-past" | "horizon-exceeded" | "party-too-large" };

export interface ReservationSlotOptions {
  /** Fully allocatable plans; smallest-fit selection happens inside. */
  options?: AllocationOption[];
  /** Extra overlapping allocations beyond what the store reports (tests). */
  blocks?: import("./domain").BlockingIntervalInput[];
}

export async function getReservationSlotsFromStore(
  input: AvailabilityRequest,
  now: Date,
  deps: { store: ReservationReadStore; options?: ReservationSlotOptions },
): Promise<ReservationSlotsResult> {
  const config = await deps.store.getReservationConfig();
  if (!config) return { status: "error", reason: "service-unavailable" };
  if (input.partySize > config.maxPartySize) {
    return { status: "rejected", reason: "party-too-large" };
  }

  const todayKey = berlinDateKey(now.getTime());
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const [year, month, day] = input.date.split("-").map(Number);
  const requestedUtc = Date.UTC(year, month - 1, day);
  if (requestedUtc < todayUtc) return { status: "rejected", reason: "date-in-past" };
  if (requestedUtc >= todayUtc + config.horizonDays * 24 * 60 * 60 * 1000) {
    return { status: "rejected", reason: "horizon-exceeded" };
  }

  const [inventory, windows, closures, blocks] = await Promise.all([
    Promise.all([deps.store.listTables(), deps.store.listCombinations()]),
    deps.store.listReservationWindows(),
    deps.store.listReservationClosures(),
    deps.store.listReservationBlocks(),
  ]);
  const options =
    deps.options?.options ?? buildAllocationOptions(inventory[0], inventory[1]);

  return {
    status: "slots",
    slots: buildReservationSlots({
      now,
      date: input.date,
      partySize: input.partySize,
      config,
      windows,
      closures,
      options,
      blocks: [...(deps.options?.blocks ?? []), ...blocks],
    }),
  };
}