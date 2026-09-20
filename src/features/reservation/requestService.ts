import {
  derivePublicReservationToken,
  hashReservationRequest,
  reservationRequestSchema,
  sha256Hex,
  type ReservationCancelProjection,
  type ReservationCancelResult,
  type ReservationRequestProjection,
  type ReservationRequestResult,
} from "./request";
import { getReservationSlotsFromStore } from "./availability";
import type { ReservationReadStore } from "./availability";

export interface ReservationRunner {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}

export interface ReservationRequestServiceDeps {
  pool: ReservationRunner;
  secret: string;
  store: ReservationReadStore;
  now?: Date;
}

export interface ReservationPublicStatusProjection {
  number: number;
  status: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  partySize: number;
  version: number;
}

interface RequestOutcomeRow {
  create_reservation_request: {
    outcome: string;
    reason?: string;
    number?: number;
    status?: string;
    startsAt?: string;
    endsAt?: string;
    expiresAt?: string;
    partySize?: number;
    reservationId?: string;
  };
}

interface CancelOutcomeRow {
  cancel_reservation: {
    outcome: string;
    number?: number;
    status?: string;
    startsAt?: string;
    endsAt?: string;
    partySize?: number;
  } | null;
}

function requestProjection(value: RequestOutcomeRow["create_reservation_request"]): ReservationRequestProjection {
  return {
    number: Number(value.number),
    status: String(value.status),
    startsAt: String(value.startsAt),
    endsAt: String(value.endsAt),
    expiresAt: String(value.expiresAt),
    partySize: Number(value.partySize),
  };
}

export async function createReservationRequest(
  raw: unknown,
  deps: ReservationRequestServiceDeps,
): Promise<ReservationRequestResult> {
  if (!deps.pool || !deps.secret || !deps.store) {
    return { status: "error", reason: "service-unavailable" };
  }
  const parsed = reservationRequestSchema.safeParse(raw);
  if (!parsed.success) return { status: "rejected", reason: "input" };

  const request = parsed.data;
  const now = deps.now ?? new Date();
  if (!request.privacyAccepted) return { status: "rejected", reason: "privacy-not-accepted" };

  const config = await deps.store.getReservationConfig();
  if (!config) return { status: "rejected", reason: "misconfigured" };

  const [dateKey] = request.slotStartUtc.split("T");
  const availability = await getReservationSlotsFromStore(
    { date: dateKey, partySize: request.partySize },
    now,
    { store: deps.store },
  );
  const availabilityRejected = availability.status === "rejected";
  if (availabilityRejected) {
    if (availability.reason === "party-too-large") {
      return { status: "rejected", reason: "party-too-large" };
    }
    // date-in-past / horizon-exceeded: a replay can never alter these, so the
    // request itself is invalid.
    return { status: "rejected", reason: "slot-unavailable" };
  }
  if (availability.status === "error") return { status: "rejected", reason: "misconfigured" };
  const chosen = availability.slots.find((slot) => slot.startUtc === request.slotStartUtc);
  // A missing chosen slot usually means our own pending hold now blocks it; the
  // transaction's idempotent replay resolves that case, so we still proceed.
  const startsAtUtc = chosen ? chosen.startUtc : request.slotStartUtc;

  const startsAtMs = Date.parse(startsAtUtc);
  const endsAtMs = startsAtMs + config.durationMinutes * 60_000;
  const endsAtUtc = new Date(endsAtMs).toISOString();

  const requestHash = hashReservationRequest({
    guestName: request.guestName,
    guestEmail: request.guestEmail,
    guestPhone: request.guestPhone,
    partySize: request.partySize,
    slotStartUtc: request.slotStartUtc,
    seatingPreference: request.seatingPreference ?? null,
    notes: request.notes ?? null,
    privacyVersion: request.privacyVersion,
  });

  const token = derivePublicReservationToken(deps.secret, request.idempotencyKey);
  const tokenHash = sha256Hex(token);

  let result: RequestOutcomeRow["create_reservation_request"];
  try {
    const outcome = await deps.pool.query<RequestOutcomeRow>(
      `SELECT create_reservation_request(
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        tokenHash,
        sha256Hex(request.idempotencyKey),
        requestHash,
        request.guestName,
        request.guestEmail,
        request.guestPhone,
        request.privacyVersion,
        request.partySize,
        startsAtUtc,
        endsAtUtc,
        request.seatingPreference ?? null,
        request.notes ?? null,
      ],
    );
    result = outcome.rows[0].create_reservation_request;
  } catch {
    return { status: "error", reason: "service-unavailable" };
  }

  if (result.outcome === "conflict") return { status: "conflict" };
  if (result.outcome === "rejected") {
    const reason = result.reason;
    if (
      reason === "party-too-large" ||
      reason === "below-notice" ||
      reason === "outside-hours" ||
      reason === "closed" ||
      reason === "misconfigured"
    ) {
      return { status: "rejected", reason };
    }
    return { status: "rejected", reason: "slot-unavailable" };
  }
  return {
    status: "created",
    reservation: requestProjection(result),
    token,
    replayed: result.outcome === "replayed",
  };
}

export async function getPublicReservation(
  token: string,
  deps: ReservationRequestServiceDeps,
): Promise<{ status: "not-found" } | { status: "reservation"; reservation: ReservationPublicStatusProjection }> {
  const result = await deps.pool.query<{
    reservation_number: string;
    status: string;
    starts_at: Date | string;
    ends_at: Date | string;
    expires_at: Date | string;
    party_size: number;
    version: number;
  }>(
    `SELECT reservation_number, status::text, starts_at, ends_at, expires_at, party_size, version
     FROM reservations WHERE public_token_hash = $1`,
    [sha256Hex(token)],
  );
  if (result.rows.length === 0) return { status: "not-found" };
  const row = result.rows[0];
  const asIso = (value: Date | string): string =>
    value instanceof Date ? value.toISOString() : String(value);
  return {
    status: "reservation",
    reservation: {
      number: Number(row.reservation_number),
      status: row.status,
      startsAt: asIso(row.starts_at),
      endsAt: asIso(row.ends_at),
      expiresAt: asIso(row.expires_at),
      partySize: row.party_size,
      version: row.version,
    },
  };
}

export async function getReservationCutoffMinutes(
  deps: ReservationRequestServiceDeps,
): Promise<number | null> {
  const result = await deps.pool.query<{ value: number }>(
    "SELECT value::integer FROM settings WHERE key = 'reservation_cutoff_minutes'",
  );
  return result.rows[0]?.value ?? null;
}

function parseCancelResult(value: CancelOutcomeRow["cancel_reservation"]): ReservationCancelResult {
  if (!value) return { status: "neutral" };
  if (value.outcome === "cutoff-passed") {
    return { status: "cutoff-passed", number: Number(value.number), startsAt: String(value.startsAt) };
  }
  const reservation: ReservationCancelProjection = {
    number: Number(value.number),
    status: "cancelled",
    startsAt: String(value.startsAt),
    endsAt: String(value.endsAt),
    partySize: Number(value.partySize),
  };
  return { status: "cancelled", reservation };
}

export async function cancelPublicReservation(
  token: string,
  deps: ReservationRequestServiceDeps,
): Promise<ReservationCancelResult> {
  const cutoff = await getReservationCutoffMinutes(deps);
  if (cutoff === null) return { status: "neutral" };
  try {
    const outcome = await deps.pool.query<CancelOutcomeRow>(
      "SELECT cancel_reservation($1, $2)",
      [sha256Hex(token), cutoff],
    );
    return parseCancelResult(outcome.rows[0].cancel_reservation);
  } catch {
    return { status: "neutral" };
  }
}

export async function expireReservations(
  deps: ReservationRequestServiceDeps,
): Promise<number> {
  const outcome = await deps.pool.query<{ expire_reservations: number }>(
    "SELECT expire_reservations()",
  );
  return Number(outcome.rows[0].expire_reservations);
}