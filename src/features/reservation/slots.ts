import { berlinLocalToUtcMs } from "@/features/quote/slots";
import {
  RESERVATION_SERVICE,
  type AllocationOption,
  type BlockingIntervalInput,
  type ReservationAccessConfig,
  type ReservationClosureInput,
  type ReservationSlot,
  type ReservationWindowInput,
} from "./domain";

function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

function clockLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function overlapsHalfOpen(alarmStartMs: number, alarmEndMs: number, startMs: number, endMs: number): boolean {
  return alarmStartMs < endMs && alarmEndMs > startMs;
}

/** Half-open [start, end) is used everywhere: a table is free at exactly the
 * instant the previous reservation ends (business-rules "Reservations"). */
export function buildReservationSlots(input: {
  now: Date;
  date: string;
  partySize: number;
  config: ReservationAccessConfig;
  windows: ReservationWindowInput[];
  closures: ReservationClosureInput[];
  options: AllocationOption[];
  blocks?: BlockingIntervalInput[];
}): ReservationSlot[] {
  const [year, month, day] = input.date.split("-").map(Number);
  const activeWindows = input.windows.filter((window) => window.active);
  const applies =
    activeWindows.filter((window) => window.dateOverride === input.date).length > 0
      ? activeWindows.filter((window) => window.dateOverride === input.date)
      : activeWindows.filter(
          (window) =>
            window.dateOverride === null &&
            window.weekday === new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
        );

  const durationMs = input.config.durationMinutes * 60_000;
  const earliestStartMs = input.now.getTime() + input.config.noticeMinutes * 60_000;
  const blocks = input.blocks ?? [];

  const slots: ReservationSlot[] = [];

  for (const window of applies) {
    const openMin = parseClock(window.opensAt);
    const closeMin = parseClock(window.closesAt);
    if (closeMin <= openMin) continue;

    for (let minute = openMin; minute + durationMs / 60_000 <= closeMin; minute += input.config.slotIntervalMinutes) {
      const startUtcMs = berlinLocalToUtcMs(year, month - 1, day, minute);
      const endUtcMs = startUtcMs + durationMs;
      if (startUtcMs < earliestStartMs) continue;

      if (
        input.closures.some(
          (closure) =>
            closure.affectedServices.includes(RESERVATION_SERVICE) &&
            overlapsHalfOpen(Date.parse(closure.startsAt), Date.parse(closure.endsAt), startUtcMs, endUtcMs),
        )
      ) {
        continue;
      }

      const openPlan = input.options.some((option) =>
        option.tableIds.every(
          (tableId) =>
            !blocks.some(
              (block) =>
                block.tableIds.includes(tableId) &&
                overlapsHalfOpen(block.startsAtMs, block.endsAtMs, startUtcMs, endUtcMs),
            ),
        ),
      );
      if (!openPlan) continue;

      slots.push({
        startUtc: new Date(startUtcMs).toISOString(),
        labelLocal: clockLabel(minute),
      });
    }
  }

  return slots.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
}