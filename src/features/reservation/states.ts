export type ReservationState =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "expired"
  | "completed"
  | "no_show";

export const RESERVATION_TRANSITIONS: Record<ReservationState, ReservationState[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  declined: [],
  cancelled: [],
  expired: [],
  completed: [],
  no_show: [],
};
