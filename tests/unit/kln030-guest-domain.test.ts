import { describe, expect, it } from "vitest";
import { GUEST_LOOKUP_SCHEMA, mergeGuestAnfragen } from "@/features/guest/domain";

const PHONE = "0151 2345678";

describe("KLN-030 guest lookup domain", () => {
  it("accepts a phone of 5-30 characters after trimming", () => {
    expect(GUEST_LOOKUP_SCHEMA.safeParse({ phone: PHONE }).success).toBe(true);
    expect(GUEST_LOOKUP_SCHEMA.safeParse({ phone: "  +49 170 1234567  " }).success).toBe(true);
  });

  it("rejects short, empty, overlong or extra-field payloads", () => {
    expect(GUEST_LOOKUP_SCHEMA.safeParse({ phone: "1234" }).success).toBe(false);
    expect(GUEST_LOOKUP_SCHEMA.safeParse({ phone: "" }).success).toBe(false);
    expect(GUEST_LOOKUP_SCHEMA.safeParse({ phone: " ".repeat(31) }).success).toBe(false);
    expect(GUEST_LOOKUP_SCHEMA.safeParse({ phone: PHONE, email: "x@y.de" }).success).toBe(false);
  });

  it("merges orders and reservations newest first", () => {
    const result = mergeGuestAnfragen(
      [
        {
          kind: "order",
          number: 10,
          fulfilment: "pickup",
          state: "pending_confirmation",
          scheduledFor: "2026-10-08T17:00:00.000Z",
          totalCents: 1580,
          createdAt: "2026-10-08T09:00:00.000Z",
        },
      ],
      [
        {
          kind: "reservation",
          number: 3,
          status: "pending",
          startsAt: "2026-10-09T18:00:00.000Z",
          endsAt: "2026-10-09T20:00:00.000Z",
          partySize: 2,
          createdAt: "2026-10-08T10:00:00.000Z",
        },
      ],
    );
    expect(result.map((entry) => entry.kind)).toEqual(["reservation", "order"]);
  });

  it("breaks ties by reservation first, then ascending number", () => {
    const createdAt = "2026-10-08T09:00:00.000Z";
    const result = mergeGuestAnfragen(
      [
        {
          kind: "order",
          number: 2,
          fulfilment: "delivery",
          state: "completed",
          scheduledFor: "2026-10-08T17:00:00.000Z",
          totalCents: 2300,
          createdAt,
        },
        {
          kind: "order",
          number: 1,
          fulfilment: "pickup",
          state: "cancelled",
          scheduledFor: "2026-10-07T17:00:00.000Z",
          totalCents: 900,
          createdAt,
        },
      ],
      [
        {
          kind: "reservation",
          number: 5,
          status: "confirmed",
          startsAt: "2026-10-09T18:00:00.000Z",
          endsAt: "2026-10-09T20:00:00.000Z",
          partySize: 4,
          createdAt,
        },
      ],
    );
    expect(result.map((entry) => entry.kind)).toEqual(["reservation", "order", "order"]);
    const orderNumbers = result
      .slice(1)
      .map((entry) => entry as { number: number })
      .map((entry) => entry.number);
    expect(orderNumbers).toEqual([1, 2]);
  });
});