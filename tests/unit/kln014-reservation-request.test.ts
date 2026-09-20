import { describe, expect, it } from "vitest";
import {
  RESERVATION_PRIVACY_VERSION,
  derivePublicReservationToken,
  hashReservationRequest,
  reservationRequestSchema,
  sha256Hex,
} from "@/features/reservation/request";

const valid = {
  guestName: "Anna Mustermann",
  guestEmail: "anna@example.com",
  guestPhone: "+49 170 1234567",
  partySize: 4,
  slotStartUtc: "2026-10-07T18:00:00.000Z",
  privacyVersion: RESERVATION_PRIVACY_VERSION,
  privacyAccepted: true,
  idempotencyKey: "5f8a4c3e-1b2d-4e6f-9a8b-0c1d2e3f4a5b",
};

describe("KLN-014 reservation request domain", () => {
  it("accepts a valid reservation request", () => {
    const parsed = reservationRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.partySize).toBe(4);
  });

  it("rejects invalid party sizes", () => {
    for (const partySize of [0, 13, 3.5, "x"]) {
      expect(reservationRequestSchema.safeParse({ ...valid, partySize }).success).toBe(false);
    }
  });

  it("keeps privacyAccepted schema-valid (business gate rejects later) but pins the privacy version", () => {
    expect(reservationRequestSchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(true);
    expect(reservationRequestSchema.safeParse({ ...valid, privacyVersion: "2" }).success).toBe(false);
  });

  it("rejects malformed email, short name/phone or non-uuid idempotency key", () => {
    expect(reservationRequestSchema.safeParse({ ...valid, guestEmail: "nope" }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...valid, guestName: " " }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...valid, guestPhone: "ab" }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...valid, idempotencyKey: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects unknown or stale start timestamps and extra keys", () => {
    expect(reservationRequestSchema.safeParse({ ...valid, slotStartUtc: "2026-10-07" }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it("derives a deterministic base64url token from secret and key", () => {
    const first = derivePublicReservationToken("s3crst", valid.idempotencyKey);
    const second = derivePublicReservationToken("s3crst", valid.idempotencyKey);
    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(derivePublicReservationToken("other-secret", valid.idempotencyKey)).not.toBe(first);
    expect(derivePublicReservationToken("s3crst", "00000000-0000-0000-0000-000000000000")).not.toBe(first);
  });

  it("hashes tokens and requests deterministically", () => {
    expect(sha256Hex("a")).toBe(sha256Hex("a"));
    expect(sha256Hex("a")).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });

  it("hashes request payloads independent of object key order", () => {
    const fingerA = {
      guestName: "Anna",
      guestEmail: "anna@example.com",
      guestPhone: "+49170",
      partySize: 2,
      slotStartUtc: "2026-10-07T18:00:00.000Z",
      seatingPreference: null,
      notes: null,
      privacyVersion: RESERVATION_PRIVACY_VERSION,
    };
    const fingerB = {
      notes: null,
      seatingPreference: null,
      privacyVersion: RESERVATION_PRIVACY_VERSION,
      slotStartUtc: "2026-10-07T18:00:00.000Z",
      partySize: 2,
      guestPhone: "+49170",
      guestEmail: "anna@example.com",
      guestName: "Anna",
    };
    expect(hashReservationRequest(fingerA)).toBe(hashReservationRequest(fingerB));
    expect(hashReservationRequest(fingerA)).not.toBe(
      hashReservationRequest({ ...fingerA, partySize: 3 }),
    );
  });
});