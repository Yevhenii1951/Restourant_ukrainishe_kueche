import { z } from "zod";
import type { DatabaseRunner } from "@/features/quote/slotsService";
import type { StaffContext } from "@/features/identity/domain";
import { canOperateReservations } from "@/features/identity/domain";
import type { ReservationState } from "./states";
export const reservationTransitionSchema = z.object({
  reservationId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().min(1),
  targetStatus: z.enum(["confirmed", "declined", "cancelled", "expired", "completed", "no_show"]),
  reason: z.string().trim().max(200).nullish(),
});
export interface StaffReservationListItem {
  reservationId: string;
  number: number;
  status: ReservationState;
  startsAt: string;
  partySize: number;
  version: number;
  guestName: string | null;
  guestPhone: string | null;
}

export interface StaffReservationEvent {
  fromStatus: ReservationState | null;
  toStatus: ReservationState;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface StaffReservationDetail extends StaffReservationListItem {
  endsAt: string;
  expiresAt: string;
  guestEmail: string | null;
  seatingPreference: string | null;
  notes: string | null;
  tables: string[];
  events: StaffReservationEvent[];
}

export type ReservationListResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "reservations"; items: StaffReservationListItem[] };

export type ReservationDetailResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "not-found" }
  | { status: "reservation"; reservation: StaffReservationDetail };

export type ReservationTransitionResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "validation-failed"; fieldErrors: Record<string, string[]> }
  | { status: "conflict"; number: number; reservationStatus: ReservationState; version: number }
  | { status: "illegal-transition" }
  | { status: "no-table-available" }
  | { status: "applied"; number: number; reservationStatus: ReservationState; version: number; startsAt: string };

interface ReservationRow {
  id: string;
  reservation_number: string;
  status: ReservationState;
  starts_at: Date | string;
  ends_at: Date | string;
  expires_at: Date | string;
  party_size: number;
  version: number;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  seating_preference: string | null;
  notes: string | null;
}

interface TransitionRow {
  status: string;
  number: number;
  reservationStatus: ReservationState;
  version: number;
  startsAt?: string;
}

interface EventRow {
  from_status: ReservationState | null;
  to_status: ReservationState;
  reason: string | null;
  actor_name: string | null;
  created_at: Date | string;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function validationErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export class ReservationStaffService {
  constructor(
    private readonly deps: { pool: DatabaseRunner; currentStaff: StaffContext; correlationId: string },
  ) {}

  async listReservations(): Promise<ReservationListResult> {
    if (!canOperateReservations(this.deps.currentStaff)) return { status: "error", reason: "service-unavailable" };
    const result = await this.deps.pool.query<ReservationRow>(
      `SELECT id, reservation_number, status, starts_at, ends_at, expires_at, party_size, version,
              guest_name, guest_email, guest_phone, seating_preference, notes
       FROM reservations
       WHERE status IN ('pending', 'confirmed') OR starts_at >= now() - interval '1 day'
       ORDER BY starts_at, reservation_number`,
    );
    return {
      status: "reservations",
      items: result.rows.map((row) => ({
        reservationId: row.id,
        number: Number(row.reservation_number),
        status: row.status,
        startsAt: iso(row.starts_at),
        partySize: row.party_size,
        version: row.version,
        guestName: row.guest_name,
        guestPhone: row.guest_phone,
      })),
    };
  }

  async getReservationDetail(reservationId: string): Promise<ReservationDetailResult> {
    if (!canOperateReservations(this.deps.currentStaff)) return { status: "error", reason: "service-unavailable" };
    const reservation = await this.deps.pool.query<ReservationRow>(
      `SELECT id, reservation_number, status, starts_at, ends_at, expires_at, party_size, version,
              guest_name, guest_email, guest_phone, seating_preference, notes
       FROM reservations WHERE id = $1`,
      [reservationId],
    );
    if (reservation.rows.length === 0) return { status: "not-found" };
    const row = reservation.rows[0];
    const [tables, events] = await Promise.all([
      this.deps.pool.query<{ internal_label: string }>(
        `SELECT t.internal_label FROM reservation_allocations a
         JOIN restaurant_tables t ON t.id = a.table_id
         WHERE a.reservation_id = $1 AND a.blocked ORDER BY t.internal_label`,
        [reservationId],
      ),
      this.deps.pool.query<EventRow>(
        `SELECT e.from_status, e.to_status, e.reason, sp.display_name AS actor_name, e.created_at
         FROM reservation_status_events e
         LEFT JOIN staff_profiles sp ON sp.id = e.actor
         WHERE e.reservation_id = $1 ORDER BY e.created_at`,
        [reservationId],
      ),
    ]);
    return { status: "reservation", reservation: this.detail(row, tables.rows, events.rows) };
  }

  async transitionReservation(input: unknown): Promise<ReservationTransitionResult> {
    if (!canOperateReservations(this.deps.currentStaff)) return { status: "forbidden" };
    const parsed = reservationTransitionSchema.safeParse(input);
    if (!parsed.success) return { status: "validation-failed", fieldErrors: validationErrors(parsed.error) };
    const target = parsed.data;
    const value = await this.deps.pool.query<{ apply_reservation_transition: TransitionRow | null }>(
      `SELECT apply_reservation_transition($1::uuid, $2, $3::reservation_state, $4, $5::uuid, $6)`,
      [target.reservationId, target.expectedVersion, target.targetStatus, target.reason || null, this.deps.currentStaff.id, this.deps.correlationId],
    );
    const result = value.rows[0]?.apply_reservation_transition;
    if (!result) return { status: "not-found" };
    if (result.status === "conflict") return { status: "conflict", number: result.number, reservationStatus: result.reservationStatus, version: result.version };
    if (result.status === "invalid") return { status: "illegal-transition" };
    if (result.status === "no-table-available") return { status: "no-table-available" };
    if (result.status !== "applied") return { status: "illegal-transition" };
    return { status: "applied", number: result.number, reservationStatus: result.reservationStatus, version: result.version, startsAt: String(result.startsAt) };
  }

  private detail(row: ReservationRow, tables: { internal_label: string }[], events: EventRow[]): StaffReservationDetail {
    return {
      reservationId: row.id,
      number: Number(row.reservation_number),
      status: row.status,
      startsAt: iso(row.starts_at),
      endsAt: iso(row.ends_at),
      expiresAt: iso(row.expires_at),
      partySize: row.party_size,
      version: row.version,
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      guestPhone: row.guest_phone,
      seatingPreference: row.seating_preference,
      notes: row.notes,
      tables: tables.map((table) => table.internal_label),
      events: events.map((event) => ({ ...event, fromStatus: event.from_status, toStatus: event.to_status, actorName: event.actor_name, createdAt: iso(event.created_at) })),
    };
  }
}
