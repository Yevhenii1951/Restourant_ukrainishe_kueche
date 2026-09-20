import { describe, expect, it } from "vitest";
import type { DatabaseRunner } from "@/features/quote/slotsService";
import { OrderStaffService } from "@/features/order/staffService";
import type { StaffContext } from "@/features/identity/domain";

const ORDER_UUID = "00000000-0000-0000-0000-000000000001";

function staff(overrides: Partial<StaffContext>): StaffContext {
  return { id: "staff-1", authUserId: "auth-1", role: "MANAGER", active: true, ...overrides };
}

class FakeRunner implements DatabaseRunner {
  calls: { text: string; params: unknown[] }[] = [];

  constructor(private readonly responder: (text: string, params: unknown[]) => unknown[]) {}

  async query<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    this.calls.push({ text, params });
    return { rows: this.responder(text, params) as T[] };
  }
}

function deps(
  runner: DatabaseRunner,
  currentStaff: StaffContext,
  correlationId = "corr-1",
) {
  return new OrderStaffService({ pool: runner, currentStaff, correlationId });
}

describe("KLN-012 staff order queue permissions", () => {
  it("lets STAFF list active orders and builds a line summary", async () => {
    const runner = new FakeRunner((text) => {
      if (text.includes("WHERE o.state IN"))
        return [
          {
            id: ORDER_UUID,
            order_number: "2",
            state: "pending_confirmation",
            scheduled_for: "2026-09-30T10:00:00.000Z",
            total_cents: 2450,
            version: 1,
            guest_name: "Anna",
            guest_phone: "0123",
            decided_at: null,
            item_count: "2",
          },
        ];
      if (text.includes("SELECT name_snapshot, quantity FROM order_items"))
        return [
          { name_snapshot: "Borschtsch", quantity: 1 },
          { name_snapshot: "Piroggen", quantity: 2 },
        ];
      return [];
    });
    const service = deps(runner, staff({ role: "STAFF" }));

    const result = await service.listActiveOrders();

    expect(result).toEqual({
      status: "orders",
      items: [
        {
          orderId: ORDER_UUID,
          orderNumber: 2,
          state: "pending_confirmation",
          scheduledFor: "2026-09-30T10:00:00.000Z",
          totalCents: 2450,
          version: 1,
          guestName: "Anna",
          guestPhone: "0123",
          itemCount: 2,
          lineSummary: "1× Borschtsch, 2× Piroggen",
        },
      ],
    });
  });

  it("refuses the queue for an inactive session", async () => {
    const runner = new FakeRunner(() => []);
    const service = deps(runner, staff({ active: false }));
    expect(await service.listActiveOrders()).toEqual({
      status: "error",
      reason: "service-unavailable",
    });
  });
});

describe("KLN-012 transition validation and mapping", () => {
  it("rejects cancel without a reason before touching the database", async () => {
    const runner = new FakeRunner(() => []);
    const service = deps(runner, staff({ role: "STAFF" }));

    const result = await service.transitionOrder({
      orderId: ORDER_UUID,
      expectedVersion: 1,
      targetState: "cancelled",
      reason: null,
    });

    expect(result.status).toBe("validation-failed");
    if (result.status === "validation-failed") {
      expect(result.fieldErrors.reason).toBeDefined();
    }
    expect(runner.calls).toHaveLength(0);
  });

  it("sends the actor id and correlation id with every transition", async () => {
    const runner = new FakeRunner((text) => {
      if (text.includes("apply_order_transition")) {
        return [
          {
            apply_order_transition: {
              orderNumber: 2,
              state: "applied",
              version: 2,
              scheduledFor: "2026-09-30T10:00:00",
              estimateMinutes: 45,
            },
          },
        ];
      }
      return [];
    });
    const service = deps(runner, staff({ role: "STAFF" }));

    const result = await service.transitionOrder({
      orderId: ORDER_UUID,
      expectedVersion: 1,
      targetState: "accepted",
      estimateMinutes: 45,
    });

    expect(result.status).toBe("applied");
    const call = runner.calls[0];
    expect(call.params).toContain("staff-1");
    expect(call.params).toContain("corr-1");
    if (result.status === "applied") {
      expect(result.applied.orderNumber).toBe(2);
      expect(result.applied.estimateMinutes).toBe(45);
    }
  });

  it("surfaces a stale version as a conflict", async () => {
    const runner = new FakeRunner((text) => {
      if (text.includes("apply_order_transition")) {
        return [{ apply_order_transition: { orderNumber: 2, state: "conflict", version: 3 } }];
      }
      return [];
    });
    const service = deps(runner, staff({ role: "STAFF" }));

    const result = await service.transitionOrder({
      orderId: ORDER_UUID,
      expectedVersion: 1,
      targetState: "cancelled",
      reason: "double booking",
    });

    expect(result).toMatchObject({
      status: "conflict",
      orderNumber: 2,
      version: 3,
    });
  });

  it("surfaces a rejected edge as illegal-transition", async () => {
    const runner = new FakeRunner((text) => {
      if (text.includes("apply_order_transition")) {
        return [{ apply_order_transition: { orderNumber: 2, state: "invalid", version: 4 } }];
      }
      return [];
    });
    const service = deps(runner, staff({ role: "STAFF" }));

    const result = await service.transitionOrder({
      orderId: ORDER_UUID,
      expectedVersion: 4,
      targetState: "completed",
    });

    expect(result).toMatchObject({ status: "illegal-transition" });
  });

  it("treats a missing row as not-found and never guesses it was a conflict", async () => {
    const runner = new FakeRunner(() => []);
    const service = deps(runner, staff({ role: "STAFF" }));
    const result = await service.transitionOrder({
      orderId: ORDER_UUID,
      expectedVersion: 1,
      targetState: "preparing",
    });
    expect(result).toEqual({ status: "not-found" });
  });
});

describe("KLN-012 CSV export (FR-ADM-6)", () => {
  it("forbids export for STAFF even though the queue is allowed", async () => {
    const runner = new FakeRunner(() => []);
    const service = deps(runner, staff({ role: "STAFF" }));

    const result = await service.exportOrdersCsv();

    expect(result).toEqual({ status: "error", reason: "service-unavailable" });
    expect(runner.calls).toHaveLength(0);
  });

  it("exports for MANAGER and writes the audit event", async () => {
    const runner = new FakeRunner((text) => {
      if (text.includes("WHERE o.guest_name")) {
        return [
          {
            order_number: "1",
            created_at: "2026-09-30T10:00:00.000Z",
            state: "completed",
            scheduled_for: "2026-09-30T11:00:00.000Z",
            guest_name: "Anna",
            guest_phone: "0123",
            total_cents: 2450,
          },
        ];
      }
      if (text.includes("customer data export")) return [];
      if (text.includes("INSERT INTO audit_events")) return [];
      return [];
    });
    const service = deps(runner, staff({ role: "MANAGER" }));

    const result = await service.exportOrdersCsv();

    if (result.status === "error") throw new Error("export failed");
    expect(result.csv).toContain("orderNumber,createdAt,state,scheduledFor,guestName,guestPhone,totalCents");
    expect(result.csv).toContain("Anna");
    expect(runner.calls.some((call) => call.text.includes("INSERT INTO audit_events"))).toBe(true);
  });

  it("neutralizes spreadsheet formula injection", async () => {
    const runner = new FakeRunner((text) => {
      if (text.includes("WHERE o.guest_name")) {
        return [
          {
            order_number: "1",
            created_at: "2026-09-30T10:00:00.000Z",
            state: "pending_confirmation",
            scheduled_for: "2026-09-30T11:00:00.000Z",
            guest_name: "=HYPERLINK(evil)",
            guest_phone: "COM1",
            total_cents: 0,
          },
        ];
      }
      if (text.includes("INSERT INTO audit_events")) return [];
      return [];
    });
    const service = deps(runner, staff({ role: "MANAGER" }));

    const result = await service.exportOrdersCsv();

    if (result.status === "error") throw new Error("export failed");
    expect(result.csv).toContain("'=");
  });
});

describe("KLN-012 pickup intake availability", () => {
  it("reports open by default when no setting exists", async () => {
    const runner = new FakeRunner(() => []);
    const service = deps(runner, staff({ role: "STAFF" }));
    expect(await service.getPickupAccepting()).toEqual({ enabled: true });
  });

  it("passes the intended value through to the pivot function", async () => {
    const runner = new FakeRunner(() => []);
    const service = deps(runner, staff({ role: "STAFF" }));
    const result = await service.setPickupAccepting(false);
    expect(result).toEqual({ status: "ok", accepting: { enabled: false } });
    expect(runner.calls[0].params[0]).toBe(false);
  });
});