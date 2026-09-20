import { describe, expect, it } from "vitest";
import {
  buildAllocationOptions,
  selectSmallestPlan,
  validateCombination,
  type ReservationAccessConfig,
  type ReservationTableInput,
} from "@/features/reservation/domain";
import { buildReservationSlots } from "@/features/reservation/slots";
import { getReservationSlotsFromStore } from "@/features/reservation/availability";
import type { ReservationReadStore } from "@/features/reservation/availability";
import type { ReservationStore } from "@/features/reservation/store";

const CONFIG: ReservationAccessConfig = {
  durationMinutes: 120,
  horizonDays: 90,
  noticeMinutes: 120,
  slotIntervalMinutes: 15,
  maxPartySize: 12,
};

const T = (id: string, capacity: number, active = true): ReservationTableInput => ({
  id,
  internalLabel: `T-${id}`,
  capacity,
  area: "Saal",
  active,
});

const store = (overrides: Partial<ReservationStore>): ReservationReadStore => ({
  getReservationConfig: async () => CONFIG,
  listTables: async () => [T("a", 2), T("b", 4), T("c", 6)],
  listCombinations: async () => [
    {
      id: "combo-1",
      name: "Saal Fenster",
      capacity: 6,
      active: true,
      memberTableIds: ["a", "b"],
    },
  ],
  listReservationWindows: async () => [
    { weekday: 3, dateOverride: null, opensAt: "12:00", closesAt: "23:00", active: true },
  ],
  listReservationClosures: async () => [],
  listReservationBlocks: async () => [],
  ...overrides,
});

describe("KLN-013 reservation availability domain", () => {
  it("selects the smallest plan that fits the party and never exposes table identities", () => {
    const options = buildAllocationOptions(
      [T("a", 2), T("b", 4), T("c", 6)],
      [
        { id: "combo-1", name: "Saal Fenster", capacity: 6, active: true, memberTableIds: ["a", "b"] },
      ],
    );
    expect(selectSmallestPlan(options, 4)).toEqual({ kind: "table", tableIds: ["b"], capacity: 4 });
    expect(selectSmallestPlan(options, 5)).toEqual({ kind: "combination", tableIds: ["a", "b"], capacity: 6 });
    expect(selectSmallestPlan(options, 7)).toBeNull();
  });

  it("returns only startUtc and labelLocal on public slots", () => {
    const slots = buildReservationSlots({
      now: new Date("2026-10-07T08:00:00.000Z"),
      date: "2026-10-07",
      partySize: 4,
      config: CONFIG,
      windows: [{ weekday: 3, dateOverride: null, opensAt: "12:00", closesAt: "14:00", active: true }],
      closures: [],
      options: buildAllocationOptions([T("a", 2), T("b", 4), T("c", 6)], []),
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(Object.keys(slot).sort()).toEqual(["labelLocal", "startUtc"]);
      expect(slot.startUtc).toMatch(/T\d{2}:\d{2}:00\.000Z$/);
    }
  });

  it("is half-open: a closure ending exactly at a start does not block, overlapping ranges do", () => {
    const start = Date.parse("2026-10-07T10:00:00.000Z");
    const options = buildAllocationOptions([T("b", 4)], []);
    const base = {
      now: new Date("2026-10-07T08:00:00.000Z"),
      date: "2026-10-07",
      partySize: 4,
      config: CONFIG,
      windows: [{ weekday: 3, dateOverride: null, opensAt: "12:00", closesAt: "14:00", active: true }],
      options,
    };

    const touching = buildReservationSlots({
      ...base,
      closures: [],
      blocks: [{ startsAtMs: start, endsAtMs: start, tableIds: ["b"] }],
    });
    expect(touching.length).toBeGreaterThan(0);

    const overlapping = buildReservationSlots({
      ...base,
      closures: [],
      blocks: [{ startsAtMs: start, endsAtMs: start + 15 * 60_000, tableIds: ["b"] }],
    });
    expect(overlapping).toEqual([]);
  });

  it("treats closures as half-open ranges and honours the affected service list", () => {
    const slotWindow = [{ weekday: 3, dateOverride: null, opensAt: "12:00", closesAt: "14:00", active: true }];
    const options = buildAllocationOptions([T("b", 4)], []);
    const base = {
      now: new Date("2026-10-07T08:00:00.000Z"),
      date: "2026-10-07",
      partySize: 4,
      config: CONFIG,
      windows: slotWindow,
      options,
    };

    const otherServiceOnly = buildReservationSlots({
      ...base,
      closures: [
        {
          startsAt: "2026-10-07T09:00:00.000Z",
          endsAt: "2026-10-07T15:00:00.000Z",
          affectedServices: ["pickup"],
        },
      ],
    });
    expect(otherServiceOnly.length).toBeGreaterThan(0);

    const affected = buildReservationSlots({
      ...base,
      closures: [
        {
          startsAt: "2026-10-07T09:00:00.000Z",
          endsAt: "2026-10-07T15:00:00.000Z",
          affectedServices: ["reservation"],
        },
      ],
    });
    expect(affected).toEqual([]);
  });

  it("converts local start times to UTC across the spring-forward DST boundary", () => {
    const slots = buildReservationSlots({
      now: new Date("2026-03-29T00:00:00.000Z"),
      date: "2026-03-29",
      partySize: 2,
      config: { ...CONFIG, durationMinutes: 60, slotIntervalMinutes: 60, noticeMinutes: 0 },
      windows: [{ weekday: 0, dateOverride: null, opensAt: "12:00", closesAt: "13:00", active: true }],
      closures: [],
      options: buildAllocationOptions([T("a", 2)], []),
    });
    expect(slots[0]).toEqual({
      startUtc: "2026-03-29T10:00:00.000Z",
      labelLocal: "12:00",
    });
  });

  it("converts local start times to UTC across the autumn DST boundary", () => {
    const slots = buildReservationSlots({
      now: new Date("2026-10-25T00:00:00.000Z"),
      date: "2026-10-25",
      partySize: 2,
      config: { ...CONFIG, durationMinutes: 60, slotIntervalMinutes: 60, noticeMinutes: 0 },
      windows: [{ weekday: 0, dateOverride: null, opensAt: "12:00", closesAt: "13:00", active: true }],
      closures: [],
      options: buildAllocationOptions([T("a", 2)], []),
    });
    expect(slots[0]).toEqual({
      startUtc: "2026-10-25T11:00:00.000Z",
      labelLocal: "12:00",
    });
  });

  it("recomputes combination capacity and rejects unknown or inactive members", () => {
    const tables = [T("a", 2), T("b", 4), T("c", 6, false)];
    expect(
      validateCombination({ name: "Zwei Tische", memberTableIds: ["a", "b"] }, tables),
    ).toEqual({ ok: true, capacity: 6 });
    expect(
      validateCombination({ name: "Duplikat", memberTableIds: ["a", "a", "b"] }, tables),
    ).toEqual({ ok: true, capacity: 6 });
    expect(
      validateCombination({ name: "Unbekannt", memberTableIds: ["a", "missing"] }, tables),
    ).toEqual({ ok: false, errors: expect.arrayContaining([expect.stringContaining("missing")]) });
    expect(
      validateCombination({ name: "Inaktiv", memberTableIds: ["a", "c"] }, tables).ok,
    ).toBe(false);
    expect(
      validateCombination({ name: "Nur einer", memberTableIds: ["a"] }, tables).ok,
    ).toBe(false);
  });

  it("builds options only from active tables and valid combinations", () => {
    const options = buildAllocationOptions(
      [T("a", 2), T("b", 4), T("c", 6, false)],
      [
        { id: "c1", name: "gültig", capacity: 6, active: true, memberTableIds: ["a", "b"] },
        { id: "c2", name: "inaktiv", capacity: 10, active: false, memberTableIds: ["a", "b"] },
        { id: "c3", name: "einzeln", capacity: 4, active: true, memberTableIds: ["b"] },
      ],
    );
    const capacities = options.map((option) => option.capacity).sort((a, b) => a - b);
    expect(capacities).toEqual([2, 4, 6]);
  });
});

describe("KLN-013 availability orchestration", () => {
  it("rejects requested parties above the configured cap", async () => {
    const result = await getReservationSlotsFromStore(
      { date: "2026-10-07", partySize: 13 },
      new Date("2026-10-07T08:00:00.000Z"),
      { store: store({}) },
    );
    expect(result).toEqual({ status: "rejected", reason: "party-too-large" });
  });

  it("rejects past dates and dates beyond the booking horizon", async () => {
    const now = new Date("2026-10-07T08:00:00.000Z");
    const past = await getReservationSlotsFromStore(
      { date: "2026-10-06", partySize: 4 },
      now,
      { store: store({}) },
    );
    expect(past).toEqual({ status: "rejected", reason: "date-in-past" });

    const far = await getReservationSlotsFromStore(
      { date: "2027-03-01", partySize: 4 },
      now,
      { store: store({}) },
    );
    expect(far).toEqual({ status: "rejected", reason: "horizon-exceeded" });
  });

  it("fails closed when reservation settings are missing", async () => {
    const result = await getReservationSlotsFromStore(
      { date: "2026-10-07", partySize: 2 },
      new Date("2026-10-07T08:00:00.000Z"),
      { store: store({ getReservationConfig: async () => null }) },
    );
    expect(result).toEqual({ status: "error", reason: "service-unavailable" });
  });
});