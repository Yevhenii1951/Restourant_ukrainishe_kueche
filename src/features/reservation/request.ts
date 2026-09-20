import { createHash, createHmac } from "node:crypto";
import { z } from "zod";

export const RESERVATION_PRIVACY_VERSION = "1";

export const reservationRequestSchema = z
  .object({
    guestName: z.string().trim().min(1).max(80),
    guestEmail: z.string().trim().email().max(254),
    guestPhone: z.string().trim().min(3).max(30),
    partySize: z.coerce.number().int().min(1).max(12),
    slotStartUtc: z.string().datetime(),
    seatingPreference: z.string().trim().max(120).nullish(),
    notes: z.string().trim().max(500).nullish(),
    privacyVersion: z.literal(RESERVATION_PRIVACY_VERSION),
    privacyAccepted: z.boolean(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export type ReservationRequestInput = z.infer<typeof reservationRequestSchema>;

export interface ReservationRequestProjection {
  number: number;
  status: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  partySize: number;
}

export interface ReservationCancelProjection {
  number: number;
  status: "cancelled";
  startsAt: string;
  endsAt: string;
  partySize: number;
}

export type ReservationRequestResult =
  | { status: "error"; reason: "service-unavailable" }
  | {
      status: "rejected";
      reason:
        | "input"
        | "privacy-not-accepted"
        | "slot-unavailable"
        | "party-too-large"
        | "below-notice"
        | "outside-hours"
        | "closed"
        | "misconfigured";
    }
  | { status: "conflict" }
  | { status: "created"; reservation: ReservationRequestProjection; token: string; replayed: boolean };

export type ReservationCancelResult =
  | { status: "neutral" }
  | { status: "cutoff-passed"; number: number; startsAt: string }
  | { status: "cancelled"; reservation: ReservationCancelProjection };

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Deterministic: the same idempotency key always yields the same opaque public
 * token, so an idempotent replay reproduces the original link without the
 * server ever storing the raw token (AC-4).
 */
export function derivePublicReservationToken(secret: string, idempotencyKey: string): string {
  return createHmac("sha256", secret)
    .update(`reservation-token:${idempotencyKey}`)
    .digest("base64url");
}

export interface ReservationRequestFingerprint {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  slotStartUtc: string;
  seatingPreference: string | null;
  notes: string | null;
  privacyVersion: string;
}

/** Fixed-field-order fingerprint so identical payloads replay identically. */
export function hashReservationRequest(fingerprint: ReservationRequestFingerprint): string {
  return sha256Hex(
    JSON.stringify([
      fingerprint.guestName,
      fingerprint.guestEmail,
      fingerprint.guestPhone,
      fingerprint.partySize,
      fingerprint.slotStartUtc,
      fingerprint.seatingPreference ?? "",
      fingerprint.notes ?? "",
      fingerprint.privacyVersion,
    ]),
  );
}