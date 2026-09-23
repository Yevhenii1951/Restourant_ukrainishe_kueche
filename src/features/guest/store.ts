import type { DatabaseRunner } from "@/features/quote/slotsService";
import type { GuestOrderSummary, GuestReservationSummary } from "./domain";

export interface GuestLookupStore {
  listOrdersByPhone(phone: string): Promise<GuestOrderSummary[]>;
  listReservationsByPhone(phone: string): Promise<GuestReservationSummary[]>;
}

interface OrderRow {
  order_number: string;
  fulfilment: string;
  state: string;
  scheduled_for: Date;
  total_cents: string;
  created_at: Date;
}

interface ReservationRow {
  reservation_number: string;
  status: string;
  starts_at: Date;
  ends_at: Date;
  party_size: string;
  created_at: Date;
}

const MAX_LOOKUP_ROWS = 50;

export function createPostgresGuestStore(runner: DatabaseRunner): GuestLookupStore {
  return {
    async listOrdersByPhone(phone) {
      const { rows } = await runner.query<OrderRow>(
        `SELECT order_number, fulfilment, state, scheduled_for, total_cents, created_at
         FROM orders
         WHERE guest_phone = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [phone, MAX_LOOKUP_ROWS],
      );
      return rows.map((row) => ({
        kind: "order" as const,
        number: Number(row.order_number),
        fulfilment: row.fulfilment === "delivery" ? ("delivery" as const) : ("pickup" as const),
        state: row.state,
        scheduledFor: new Date(row.scheduled_for).toISOString(),
        totalCents: Number(row.total_cents),
        createdAt: new Date(row.created_at).toISOString(),
      }));
    },

    async listReservationsByPhone(phone) {
      const { rows } = await runner.query<ReservationRow>(
        `SELECT reservation_number, status, starts_at, ends_at, party_size, created_at
         FROM reservations
         WHERE guest_phone = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [phone, MAX_LOOKUP_ROWS],
      );
      return rows.map((row) => ({
        kind: "reservation" as const,
        number: Number(row.reservation_number),
        status: row.status,
        startsAt: new Date(row.starts_at).toISOString(),
        endsAt: new Date(row.ends_at).toISOString(),
        partySize: Number(row.party_size),
        createdAt: new Date(row.created_at).toISOString(),
      }));
    },
  };
}