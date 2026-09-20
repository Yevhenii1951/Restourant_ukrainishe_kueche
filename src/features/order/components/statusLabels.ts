import type { OrderState } from "../transitions";

export const ORDER_STATUS_LABELS: Record<OrderState, string> = {
  awaiting_payment: "Wartet auf Zahlung",
  pending_confirmation: "Wartet auf Bestätigung",
  accepted: "Bestätigt",
  preparing: "In Zubereitung",
  ready: "Abholbereit",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  rejected: "Abgelehnt",
  payment_failed: "Zahlung fehlgeschlagen",
};

export function formatEuros(cents: number): string {
  return `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function formatSchedule(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date);
}