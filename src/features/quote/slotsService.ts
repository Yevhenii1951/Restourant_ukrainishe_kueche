import { normalizeGermanPlz } from "./domain";
import { berlinDateKey, buildOrderSlots } from "./slots";
import type { QuoteStore } from "./store";

export interface DatabaseRunner {
  query<T>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

export type CoreSlotsResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "slots"; slots: import("./slots").OrderSlot[] }
  | { status: "rejected"; reason: "zone-not-eligible" | "date-in-past" | "horizon-exceeded" };

const SCHEDULED_WINDOW = 10 * 60 * 1000;

function activeOrderBucketQuery(
  fulfilment: string,
  firstStartMs: number,
  lastStartMs: number,
  runner: DatabaseRunner,
) {
  return runner.query<{ ms: string; n: string }>(
    `SELECT floor(extract(epoch FROM scheduled_for) * 1000)::bigint AS ms, count(*)::int AS n
     FROM orders
     WHERE fulfilment = $1
       AND scheduled_for >= $2 AND scheduled_for <= $3
       AND state NOT IN ('cancelled', 'rejected')
     GROUP BY scheduled_for`,
    [fulfilment, new Date(firstStartMs).toISOString(), new Date(lastStartMs).toISOString()],
  );
}

export async function getSlotsFromStore(
  input: { fulfilment: "pickup" | "delivery"; plz?: string | null; date: string },
  now: Date,
  deps: { store: QuoteStore; pool?: DatabaseRunner },
): Promise<CoreSlotsResult> {
  const settings = await deps.store.getCommerceSettings();
  if (!settings) return { status: "error", reason: "service-unavailable" };

  const plz = input.fulfilment === "delivery" ? normalizeGermanPlz(input.plz ?? "") : null;
  if (input.fulfilment === "delivery" && !plz) {
    return { status: "rejected", reason: "zone-not-eligible" };
  }
  const zone = plz ? await deps.store.getDeliveryZoneByPlz(plz) : null;
  if (input.fulfilment === "delivery" && !zone) {
    return { status: "rejected", reason: "zone-not-eligible" };
  }

  const [year, month, day] = input.date.split("-").map(Number);
  const requestedUtc = Date.UTC(year, month - 1, day);
  const todayKey = berlinDateKey(now.getTime());
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  if (requestedUtc < todayUtc) return { status: "rejected", reason: "date-in-past" };
  if (requestedUtc >= todayUtc + settings.schedulingHorizonDays * 24 * 60 * 60 * 1000) {
    return { status: "rejected", reason: "horizon-exceeded" };
  }

  const windows = await deps.store.listServiceWindows();
  const closures = await deps.store.listClosures();
  const slotInput = {
    now,
    fulfilment: input.fulfilment,
    date: input.date,
    settings: { asapLeadMinutes: settings.asapLeadMinutes, slotIntervalMinutes: settings.slotIntervalMinutes },
    windows: windows.map((window) => ({
      id: window.id,
      weekday: window.weekday,
      dateOverride: window.dateOverride,
      opensAt: window.opensAt,
      closesAt: window.closesAt,
      capacityPerSlot: window.capacityPerSlot,
      active: window.active,
    })),
    closures: closures.map((closure) => ({
      startsAt: closure.startsAt,
      endsAt: closure.endsAt,
      affectedServices: closure.affectedServices,
    })),
  };

  if (!deps.pool) return { status: "slots", slots: buildOrderSlots(slotInput) };

  const uncounted = buildOrderSlots(slotInput);
  if (uncounted.length === 0) return { status: "slots", slots: uncounted };

  const firstStartMs = Date.parse(uncounted[0].startUtc);
  const lastStartMs = Date.parse(uncounted[uncounted.length - 1].startUtc);
  let booked: Map<number, number> = new Map();
  try {
    const result = await activeOrderBucketQuery(input.fulfilment, firstStartMs - SCHEDULED_WINDOW, lastStartMs + SCHEDULED_WINDOW, deps.pool);
    booked = new Map(result.rows.map((row) => [Number(row.ms), Number(row.n)]));
  } catch {
    booked = new Map();
  }

  return {
    status: "slots",
    slots: buildOrderSlots({
      ...slotInput,
      bookedByInterval: (startUtcMs) => booked.get(startUtcMs) ?? 0,
    }),
  };
}