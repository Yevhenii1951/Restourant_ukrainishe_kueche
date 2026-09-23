import { z } from "zod";

export const GUEST_LOOKUP_SCHEMA = z
  .object({
    phone: z.string().trim().min(5).max(30),
  })
  .strict();

export type GuestLookupInput = z.infer<typeof GUEST_LOOKUP_SCHEMA>;

export interface GuestOrderSummary {
  kind: "order";
  number: number;
  fulfilment: "pickup" | "delivery";
  state: string;
  scheduledFor: string;
  totalCents: number;
  createdAt: string;
}

export interface GuestReservationSummary {
  kind: "reservation";
  number: number;
  status: string;
  startsAt: string;
  endsAt: string;
  partySize: number;
  createdAt: string;
}

export type GuestEntry = GuestOrderSummary | GuestReservationSummary;

/** Combine orders and reservations into one newest-first overview. */
export function mergeGuestAnfragen(
  orders: GuestOrderSummary[],
  reservations: GuestReservationSummary[],
): GuestEntry[] {
  return [...orders, ...reservations].sort((a, b) => {
    const byCreatedAt = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (byCreatedAt !== 0) return byCreatedAt;
    if (a.kind !== b.kind) return a.kind === "reservation" ? -1 : 1;
    return a.number - b.number;
  });
}

export const GUEST_ORDER_STATE_KEYS: Record<string, string> = {
  awaiting_payment: "orderStateAwaitingPayment",
  pending_confirmation: "orderStatePending",
  accepted: "orderStateAccepted",
  preparing: "orderStatePreparing",
  ready: "orderStateReady",
  completed: "orderStateCompleted",
  cancelled: "orderStateCancelled",
  rejected: "orderStateRejected",
  payment_failed: "orderStatePaymentFailed",
};

export const GUEST_RESERVATION_STATE_KEYS: Record<string, string> = {
  pending: "reservationStatePending",
  confirmed: "reservationStateConfirmed",
  declined: "reservationStateDeclined",
  cancelled: "reservationStateCancelled",
  expired: "reservationStateExpired",
  completed: "reservationStateCompleted",
  no_show: "reservationStateNoShow",
};