import { describe, expect, it } from "vitest";
import {
  buildOrderSlots,
  type ClosureInput,
  type ServiceWindowInput,
} from "@/features/quote/slots";

const LEAD_30 = { asapLeadMinutes: 30, slotIntervalMinutes: 15 };

function window(overrides: Partial<ServiceWindowInput> = {}): ServiceWindowInput {
  return {
    id: "w1",
    weekday: 3,
    dateOverride: null,
    opensAt: "11:30",
    closesAt: "22:00",
    capacityPerSlot: 8,
    active: true,
    ...overrides,
  };
}

describe("KLN-010 capacity-aware fulfilment slots (FR-ORD-2)", () => {
  it("builds capacity-aware local slots with monotonic UTC instants", () => {
    const slots = buildOrderSlots({
      now: new Date("2026-10-07T08:00:00.000Z"),
      fulfilment: "pickup",
      date: "2026-10-07",
      settings: LEAD_30,
      windows: [window()],
      closures: [],
    });
    expect(slots[0].startUtc).toBe(new Date("2026-10-07T09:30:00.000Z").toISOString());
    expect(slots[slots.length - 1].startUtc).toBe(new Date("2026-10-07T19:45:00.000Z").toISOString());
    expect(slots).toHaveLength(42);
    expect(slots[0].labelLocal).toBe("11:30");
    expect(slots.every((slot) => slot.remainingCapacity === 8)).toBe(true);
  });

  it("honours the ASAP lead time from the current instant", () => {
    const slots = buildOrderSlots({
      now: new Date("2026-10-07T10:00:00.000Z"),
      fulfilment: "pickup",
      date: "2026-10-07",
      settings: LEAD_30,
      windows: [window()],
      closures: [],
    });
    expect(slots[0].startUtc).toBe(new Date("2026-10-07T10:30:00.000Z").toISOString());
  });

  it("requires the last slot to fit before closing", () => {
    const slots = buildOrderSlots({
      now: new Date("2026-10-07T08:00:00.000Z"),
      fulfilment: "pickup",
      date: "2026-10-07",
      settings: { asapLeadMinutes: 0, slotIntervalMinutes: 15 },
      windows: [window({ opensAt: "11:00", closesAt: "12:15" })],
      closures: [],
    });
    expect(slots.map((slot) => slot.labelLocal)).toEqual([
      "11:00",
      "11:15",
      "11:30",
      "11:45",
      "12:00",
    ]);
  });

  it("suppresses slots that overlap a service closure", () => {
    const closure: ClosureInput = {
      startsAt: "2026-10-07T10:00:00.000Z",
      endsAt: "2026-10-07T11:00:00.000Z",
      affectedServices: ["delivery"],
    };
    const slots = buildOrderSlots({
      now: new Date("2026-10-07T08:00:00.000Z"),
      fulfilment: "delivery",
      date: "2026-10-07",
      settings: LEAD_30,
      windows: [window({ opensAt: "11:00", closesAt: "14:00" })],
      closures: [closure],
    });
    expect(slots.map((slot) => slot.labelLocal)).toEqual([
      "11:00",
      "11:15",
      "11:30",
      "11:45",
      "13:00",
      "13:15",
      "13:30",
      "13:45",
    ]);
  });

  it("stays strictly monotonic and correct across a DST transition", () => {
    const slots = buildOrderSlots({
      now: new Date("2026-03-28T20:00:00.000Z"),
      fulfilment: "pickup",
      date: "2026-03-29",
      settings: { asapLeadMinutes: 0, slotIntervalMinutes: 15 },
      windows: [window({ weekday: 0, opensAt: "09:00", closesAt: "12:00" })],
      closures: [],
    });
    expect(slots[0].startUtc).toBe(new Date("2026-03-29T07:00:00.000Z").toISOString());
    expect(slots).toHaveLength(12);
    const utcTimes = slots.map((slot) => Date.parse(slot.startUtc));
    for (let index = 1; index < utcTimes.length; index += 1) {
      expect(utcTimes[index] - utcTimes[index - 1]).toBe(15 * 60 * 1000);
    }
  });

  it("returns no slots when no active window matches the requested date", () => {
    const slots = buildOrderSlots({
      now: new Date("2026-10-07T08:00:00.000Z"),
      fulfilment: "pickup",
      date: "2026-10-08",
      settings: LEAD_30,
      windows: [window()],
      closures: [],
    });
    expect(slots).toEqual([]);
  });

  it("applies date overrides instead of weekly windows", () => {
    const slots = buildOrderSlots({
      now: new Date("2026-10-07T08:00:00.000Z"),
      fulfilment: "pickup",
      date: "2026-10-07",
      settings: LEAD_30,
      windows: [
        window(),
        window({ id: "override", weekday: null, dateOverride: "2026-10-07", opensAt: "18:00", closesAt: "19:00" }),
      ],
      closures: [],
    });
    expect(slots.map((slot) => slot.labelLocal)).toEqual([
      "18:00",
      "18:15",
      "18:30",
      "18:45",
    ]);
  });
});