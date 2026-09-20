import { describe, expect, it } from "vitest";
import {
  transitionOrderSchema,
  transitionValidation,
} from "@/features/order/domain";
import {
  isLegalOrderTransition,
  isTerminalOrderState,
  ORDER_TRANSITIONS,
} from "@/features/order/transitions";

describe("KLN-012 order state machine (state-machines.md)", () => {
  it("exposes the exact legal edge set from the spec", () => {
    expect(ORDER_TRANSITIONS).toEqual({
      awaiting_payment: ["pending_confirmation", "payment_failed", "cancelled"],
      pending_confirmation: ["accepted", "rejected", "cancelled"],
      accepted: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
      rejected: [],
      payment_failed: [],
    });
  });

  it("rejects edges the spec does not allow and flags terminal states", () => {
    expect(isLegalOrderTransition("pending_confirmation", "completed")).toBe(false);
    expect(isLegalOrderTransition("cancelled", "accepted")).toBe(false);
    expect(isLegalOrderTransition("ready", "accepted")).toBe(false);
    expect(isLegalOrderTransition("pending_confirmation", "accepted")).toBe(true);
    for (const terminal of ["completed", "cancelled", "rejected", "payment_failed"] as const) {
      expect(isTerminalOrderState(terminal)).toBe(true);
      expect(isLegalOrderTransition(terminal, "pending_confirmation")).toBe(false);
    }
  });
});

describe("KLN-012 transition input rules (business-rules.md)", () => {
  it("requires a reason for cancel/reject", () => {
    const base = {
      orderId: "00000000-0000-0000-0000-000000000001",
      expectedVersion: 2,
      targetState: "cancelled",
    } as const;
    const fields = transitionValidation(
      transitionOrderSchema.parse({ ...base, reason: null, estimateMinutes: null }),
    );
    expect(fields.reason).toBeDefined();
    expect(fields.estimateMinutes).toBeUndefined();
  });

  it("requires estimate minutes for acceptance", () => {
    const base = {
      orderId: "00000000-0000-0000-0000-000000000001",
      expectedVersion: 1,
      targetState: "accepted",
    } as const;
    const fields = transitionValidation(
      transitionOrderSchema.parse({ ...base, reason: null, estimateMinutes: null }),
    );
    expect(fields.estimateMinutes).toBeDefined();
  });

  it("rejects estimates outside 1..240 and non-uuid order ids", () => {
    expect(
      transitionOrderSchema.safeParse({
        orderId: "nope",
        expectedVersion: 1,
        targetState: "ready",
      }).success,
    ).toBe(false);
    expect(
      transitionOrderSchema.safeParse({
        orderId: "00000000-0000-0000-0000-000000000001",
        expectedVersion: 1,
        targetState: "accepted",
        estimateMinutes: 999,
      }).success,
    ).toBe(false);
  });

  it("allows a plain state step without reason or estimate", () => {
    const parsed = transitionOrderSchema.safeParse({
      orderId: "00000000-0000-0000-0000-000000000001",
      expectedVersion: 3,
      targetState: "ready",
    });
    expect(parsed.success).toBe(true);
    expect(Object.keys(transitionValidation(parsed.data as never))).toHaveLength(0);
  });
});