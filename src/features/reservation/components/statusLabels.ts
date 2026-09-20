import type { ReservationState } from "../states";

export const RESERVATION_STATUS_LABELS: Record<ReservationState, string> = {
  pending: "In Prüfung",
  confirmed: "Bestätigt",
  declined: "Abgelehnt",
  cancelled: "Storniert",
  expired: "Abgelaufen",
  completed: "Abgeschlossen",
  no_show: "Nicht erschienen",
};

export function formatReservationTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}
