import type { Fulfilment } from "./domain";

export interface ServiceWindowInput {
  id: string;
  weekday: number | null;
  dateOverride: string | null;
  opensAt: string;
  closesAt: string;
  capacityPerSlot: number;
  active: boolean;
}

export interface ClosureInput {
  startsAt: string;
  endsAt: string;
  affectedServices: Fulfilment[];
}

export interface OrderSlot {
  startUtc: string;
  labelLocal: string;
  remainingCapacity: number;
}

export interface SlotGenerationSettings {
  asapLeadMinutes: number;
  slotIntervalMinutes: number;
}

const BERLIN = "Europe/Berlin";

function berlinOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return wall - utcMs;
}

export function berlinLocalToUtcMs(year: number, monthIndex: number, day: number, minutes: number): number {
  const guess = Date.UTC(year, monthIndex, day) + minutes * 60_000;
  const offset = berlinOffsetMs(guess);
  const adjusted = guess - offset;
  const refinedOffset = berlinOffsetMs(adjusted);
  return refinedOffset === offset ? adjusted : guess - refinedOffset;
}

export function berlinDateKey(utcMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcMs));
}

function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

function clockLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function buildOrderSlots(input: {
  now: Date;
  fulfilment: Fulfilment;
  date: string;
  settings: SlotGenerationSettings;
  windows: ServiceWindowInput[];
  closures: ClosureInput[];
  bookedByInterval?: (startUtcMs: number) => number;
}): OrderSlot[] {
  const [year, month, day] = input.date.split("-").map(Number);
  const requestedUtc = Date.UTC(year, month - 1, day);
  const businessStartUtc = requestedUtc + berlinOffsetMs(requestedUtc);
  const todayUtc = businessStartUtc;
  const isToday =
    input.now.getTime() >= todayUtc && input.now.getTime() < todayUtc + 24 * 60 * 60 * 1000;
  const leadStartMs = input.now.getTime() + input.settings.asapLeadMinutes * 60_000;
  const interval = input.settings.slotIntervalMinutes;

  const activeWindows = input.windows.filter((window) => window.active);
  const overrides = activeWindows.filter((window) => window.dateOverride === input.date);
  const applies =
    overrides.length > 0
      ? overrides
      : activeWindows.filter(
          (window) =>
            window.dateOverride === null &&
            window.weekday === new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
        );

  const slots: OrderSlot[] = [];

  for (const window of applies) {
    const openMin = parseClock(window.opensAt);
    const closeMin = parseClock(window.closesAt);
    if (closeMin <= openMin) continue;

    for (let minute = openMin; minute + interval <= closeMin; minute += interval) {
      const startUtcMs = berlinLocalToUtcMs(year, month - 1, day, minute);
      const endUtcMs = berlinLocalToUtcMs(year, month - 1, day, minute + interval);
      if (isToday && startUtcMs < leadStartMs) continue;

      const blocked = input.closures.some(
        (closure) =>
          closure.affectedServices.includes(input.fulfilment) &&
          Date.parse(closure.startsAt) < endUtcMs &&
          Date.parse(closure.endsAt) > startUtcMs,
      );
      if (blocked) continue;

      const booked = input.bookedByInterval ? input.bookedByInterval(startUtcMs) : 0;
      slots.push({
        startUtc: new Date(startUtcMs).toISOString(),
        labelLocal: clockLabel(minute),
        remainingCapacity: Math.max(0, window.capacityPerSlot - booked),
      });
    }
  }

  return slots.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
}