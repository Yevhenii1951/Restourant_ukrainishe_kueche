// Legal order state machine (docs/sdd/state-machines.md, orders block).
// Pure module on purpose: client components import it, so it must not pull
// node:crypto like order/domain.ts does.

export const ORDER_STATES = [
  "awaiting_payment",
  "pending_confirmation",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "rejected",
  "payment_failed",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export const ORDER_TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  awaiting_payment: ["pending_confirmation", "payment_failed", "cancelled"],
  pending_confirmation: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
  payment_failed: [],
};

export function isLegalOrderTransition(from: OrderState, to: OrderState): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function isTerminalOrderState(state: OrderState): boolean {
  return state === "completed" || state === "cancelled" || state === "rejected" || state === "payment_failed";
}

export const ACTIVE_ORDER_STATES: readonly OrderState[] = [
  "pending_confirmation",
  "awaiting_payment",
  "accepted",
  "preparing",
  "ready",
];
