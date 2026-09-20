import { beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import {
  RESERVATION_PRIVACY_VERSION,
  derivePublicReservationToken,
  sha256Hex,
} from "@/features/reservation/request";
import {
  createReservationRequest,
  cancelPublicReservation,
  type ReservationRequestServiceDeps,
} from "@/features/reservation/requestService";
import type { ReservationAccessConfig } from "@/features/reservation/domain";
import type { ReservationStore } from "@/features/reservation/store";

async function withRole<T>(
  databaseUrl: string,
  role: string,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`SET ROLE ${role}`);
    return await run(client);
  } finally {
    await client.end();
  }
}

const SETTING_KEYS = [
  "reservation_duration_minutes",
  "reservation_horizon_days",
  "reservation_notice_minutes",
  "reservation_slot_interval_minutes",
  "reservation_max_party",
];

function poolStore(pool: Pool): Pick<
  ReservationStore,
  | "getReservationConfig"
  | "listTables"
  | "listCombinations"
  | "listReservationWindows"
  | "listReservationClosures"
  | "listReservationBlocks"
> {
  return {
    async getReservationConfig(): Promise<ReservationAccessConfig | null> {
      const { rows } = await pool.query<{ key: string; value: unknown }>(
        `SELECT key, value FROM settings WHERE key = ANY($1)`,
        [SETTING_KEYS],
      );
      const values = new Map(rows.map((row) => [row.key, row.value]));
      if (!SETTING_KEYS.every((key) => typeof values.get(key) === "number")) return null;
      return {
        durationMinutes: values.get("reservation_duration_minutes") as number,
        horizonDays: values.get("reservation_horizon_days") as number,
        noticeMinutes: values.get("reservation_notice_minutes") as number,
        slotIntervalMinutes: values.get("reservation_slot_interval_minutes") as number,
        maxPartySize: values.get("reservation_max_party") as number,
      };
    },

    async listTables() {
      const { rows } = await pool.query(
        "SELECT id, internal_label, capacity, area, active FROM restaurant_tables",
      );
      return rows.map((row) => ({
        id: String(row.id),
        internalLabel: row.internal_label,
        capacity: row.capacity,
        area: row.area,
        active: row.active,
      }));
    },

    async listCombinations() {
      const { rows } = await pool.query(`
        SELECT c.id, c.name, c.active, c.capacity,
               array_agg(m.table_id ORDER BY m.table_id)::text[] AS member_table_ids
        FROM table_combinations c
        LEFT JOIN table_combination_members m ON m.combination_id = c.id
        GROUP BY c.id
      `);
      return rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        capacity: row.capacity,
        active: row.active,
        memberTableIds: row.member_table_ids,
      }));
    },

    async listReservationWindows() {
      const { rows } = await pool.query(
        `SELECT weekday, date_override, opens_at, closes_at, active
         FROM service_windows WHERE fulfilment = 'reservation'`,
      );
      return rows.map((row) => ({
        weekday: row.weekday,
        dateOverride: row.date_override ? String(row.date_override) : null,
        opensAt: String(row.opens_at).slice(0, 5),
        closesAt: String(row.closes_at).slice(0, 5),
        active: row.active,
      }));
    },

    async listReservationClosures() {
      const { rows } = await pool.query(
        `SELECT starts_at, ends_at, affected_services FROM closures`,
      );
      return rows
        .filter((row) => row.affected_services.includes("reservation"))
        .map((row) => ({
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          affectedServices: row.affected_services,
        }));
    },

    async listReservationBlocks() {
      const { rows } = await pool.query(
        `SELECT a.table_id, a.starts_at, a.ends_at
         FROM reservation_allocations a
         JOIN reservations r ON r.id = a.reservation_id
         WHERE r.status IN ('pending', 'confirmed') AND a.blocked`,
      );
      return rows.map((row) => ({
        startsAtMs: new Date(row.starts_at).getTime(),
        endsAtMs: new Date(row.ends_at).getTime(),
        tableIds: [row.table_id],
      }));
    },
  };
}

const SECRET = "kln014-test-secret-that-is-long-enough";

interface CreateParams {
  tokenHash: string;
  idempotencyHash: string;
  requestHash: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  startsAt: string;
  endsAt: string;
  preference: string | null;
  notes: string | null;
}

let tokenSeq = 0;
function freshHashes(): { tokenHash: string; idempotencyHash: string; requestHash: string } {
  tokenSeq += 1;
  const tag = `kln14-test-${tokenSeq}`;
  return {
    tokenHash: sha256Hex(tag),
    idempotencyHash: sha256Hex(`idem-${tag}`),
    requestHash: sha256Hex(`req-${tag}`),
  };
}

// Distinct future slots so one test's pending hold never fills another test's
// slot. Every slot lands inside the daily window 12:00-23:00 Europe/Berlin.
let slotCounter = 0;
function nextSlot(): { startsAt: string; endsAt: string } {
  slotCounter += 1;
  const startMs = Date.parse("2026-11-10T17:00:00.000Z") + slotCounter * 24 * 60 * 60 * 1000;
  return {
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(startMs + 2 * 60 * 60 * 1000).toISOString(),
  };
}

function futureParams(partySize: number, overrides: Partial<CreateParams> = {}): CreateParams {
  const hashes = freshHashes();
  const coords = { startsAt: overrides.startsAt, endsAt: overrides.endsAt };
  const slot =
    coords.startsAt && coords.endsAt
      ? { startsAt: coords.startsAt, endsAt: coords.endsAt }
      : nextSlot();
  return {
    tokenHash: hashes.tokenHash,
    idempotencyHash: hashes.idempotencyHash,
    requestHash: hashes.requestHash,
    guestName: "Anna Mustermann",
    guestEmail: "anna@example.com",
    guestPhone: "+49 170 1234567",
    partySize,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    preference: null,
    notes: null,
    ...overrides,
  };
}

async function createViaSql(pool: Pool, params: CreateParams) {
  const { rows } = await pool.query(
    `SELECT create_reservation_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) AS outcome`,
    [
      params.tokenHash,
      params.idempotencyHash,
      params.requestHash,
      params.guestName,
      params.guestEmail,
      params.guestPhone,
      RESERVATION_PRIVACY_VERSION,
      params.partySize,
      params.startsAt,
      params.endsAt,
      params.preference,
      params.notes,
    ],
  );
  return rows[0].outcome;
}

function serviceDeps(pool: Pool): ReservationRequestServiceDeps {
  return { pool, secret: SECRET, store: poolStore(pool) };
}

// Slot shared by the anon and service-layer tests, far from every nextSlot()
// window so no pending hold interferes.
const SERVICE_SLOT = "2026-11-20T17:00:00.000Z";
const SERVICE_END = "2026-11-20T19:00:00.000Z";

describe("KLN-014 pending reservation request against the database", () => {
  let databaseUrl: string;
  let pool: Pool;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
  });

  it("creates a pending reservation with one allocation and a status event", async () => {
    const params = futureParams(4);
    const outcome = await createViaSql(pool, params);
    expect(outcome.outcome).toBe("created");
    expect(outcome.status).toBe("pending");
    expect(outcome.number).toBeGreaterThan(0);
    expect(outcome.partySize).toBe(4);

    const allocation = await pool.query(
      `SELECT a.blocked, ceil(extract(epoch FROM a.ends_at - a.starts_at) / 60)::int AS span
       FROM reservation_allocations a WHERE a.reservation_id = $1
       ORDER BY a.table_id`,
      [outcome.reservationId],
    );
    // Party 4 maps to the "Saal Fenster" combination (2+4) → two table rows.
    expect(allocation.rows).toHaveLength(2);
    for (const row of allocation.rows) {
      expect(row).toMatchObject({ blocked: true, span: 120 });
    }

    const events = await pool.query(
      `SELECT to_status, reason FROM reservation_status_events WHERE reservation_id = $1`,
      [outcome.reservationId],
    );
    expect(events.rows).toEqual([{ to_status: "pending", reason: "guest_created" }]);
  });

  it("re-plays idempotently for the same payload and conflicts on a changed one", async () => {
    const original = futureParams(4);
    const first = await createViaSql(pool, original);
    expect(first.outcome).toBe("created");
    expect(first.number).toBeGreaterThan(0);

    const replay = await createViaSql(pool, original);
    expect(replay.outcome).toBe("replayed");
    expect(replay.number).toBe(first.number);
    expect(replay.status).toBe("pending");

    const changed = futureParams(4, { guestName: "Max Mustermann" });
    const conflict = await createViaSql(pool, {
      ...changed,
      tokenHash: original.tokenHash,
      idempotencyHash: original.idempotencyHash,
    });
    expect(conflict.outcome).toBe("conflict");
  });

  it("allocates a single-plan slot exactly once under concurrency (AC-3)", async () => {
    // Party 10 fits only the "Loggia gross" combo (4+6); both clients contend
    // for the same two tables at the same time.
    const coords = nextSlot();
    const build = () => {
      const hashes = freshHashes();
      return [
        hashes.tokenHash,
        hashes.idempotencyHash,
        hashes.requestHash,
        "Anna Mustermann",
        "anna@example.com",
        "+49 170 1234567",
        RESERVATION_PRIVACY_VERSION,
        10,
        coords.startsAt,
        coords.endsAt,
        null,
        null,
      ] as string[];
    };

    const clientA = await pool.connect();
    const clientB = await pool.connect();
    try {
      await clientA.query("BEGIN");
      await clientB.query("BEGIN");

      // A's request allocates the combo; B's request is sent while A is still
      // uncommitted, so B blocks on the exclusion constraint until A commits.
      const statement = `SELECT create_reservation_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) AS outcome`;
      const resultA = await clientA.query(statement, build());
      const pendingB = clientB.query(statement, build());
      await clientA.query("COMMIT");
      const resultB = await pendingB;
      await clientB.query("COMMIT");

      const outcomes = [resultA.rows[0].outcome.outcome, resultB.rows[0].outcome.outcome].sort();
      expect(outcomes).toEqual(["created", "rejected"]);
      expect([resultA.rows[0].outcome.outcome, resultB.rows[0].outcome.outcome]).toContainEqual("created");
      const rejection = [resultA.rows[0].outcome, resultB.rows[0].outcome].find(
        (item) => item.outcome === "rejected",
      );
      expect(rejection?.reason ?? "no-table-available").toBe("no-table-available");
    } finally {
      await clientA.query("ROLLBACK").catch(() => {});
      await clientB.query("ROLLBACK").catch(() => {});
      clientA.release();
      clientB.release();
    }

    const allocated = await pool.query(
      `SELECT count(*)::int AS n FROM reservation_allocations
       WHERE starts_at = $1 AND ends_at = $2`,
      [coords.startsAt, coords.endsAt],
    );
    expect(allocated.rows[0].n).toBe(2);
  });

  it("enforces notice, party cap and duration inside the transaction", async () => {
    const belowNotice = futureParams(4, {
      startsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      endsAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
    });
    const notice = await createViaSql(pool, belowNotice);
    expect(notice.outcome).toBe("rejected");
    expect(notice.reason).toBe("below-notice");

    const tooLarge = await createViaSql(pool, futureParams(13));
    expect(tooLarge).toMatchObject({ outcome: "rejected", reason: "party-too-large" });

    const wrongDuration = futureParams(4, {
      endsAt: "2026-11-10T18:00:00.000Z",
    });
    const duration = await createViaSql(pool, wrongDuration);
    expect(duration).toMatchObject({ outcome: "rejected", reason: "duration-mismatch" });
  });

  it("rejects slots outside opening hours and during a closure", async () => {
    const outside = await createViaSql(
      pool,
      futureParams(4, {
        startsAt: "2026-11-10T09:00:00.000Z",
        endsAt: "2026-11-10T11:00:00.000Z",
      }),
    );
    expect(outside).toMatchObject({ outcome: "rejected", reason: "outside-hours" });

    const closureId = "83000000-0000-0000-0000-000000000001";
    await pool.query(
      `INSERT INTO closures (id, starts_at, ends_at, reason, affected_services)
       VALUES ($1, '2026-11-11 09:00:00+01', '2026-11-11 23:00:00+01', 'Test (Demo)', ARRAY['reservation']::commercial_service_type[])`,
      [closureId],
    );
    try {
      const closed = await createViaSql(
        pool,
        futureParams(4, {
          startsAt: "2026-11-11T17:00:00.000Z",
          endsAt: "2026-11-11T19:00:00.000Z",
        }),
      );
      expect(closed).toMatchObject({ outcome: "rejected", reason: "closed" });
    } finally {
      await pool.query("DELETE FROM closures WHERE id = $1", [closureId]);
    }
  });

  it("cancels within the cutoff, masks contact and stays idempotent (AC-4)", async () => {
    const params = futureParams(4);
    const created = await createViaSql(pool, params);
    expect(created.outcome).toBe("created");

    const cancelled = await pool.query("SELECT cancel_reservation($1, 240) AS outcome", [
      params.tokenHash,
    ]);
    const outcome = cancelled.rows[0].outcome;
    expect(outcome.outcome).toBe("cancelled");

    const row = await pool.query(
      `SELECT status, guest_name, guest_email, guest_phone, version FROM reservations WHERE id = $1`,
      [created.reservationId],
    );
    expect(row.rows[0]).toMatchObject({
      status: "cancelled",
      guest_name: null,
      guest_email: null,
      guest_phone: null,
      version: 2,
    });

    const events = await pool.query(
      `SELECT from_status, to_status, reason FROM reservation_status_events WHERE reservation_id = $1`,
      [created.reservationId],
    );
    expect(events.rows).toContainEqual({
      from_status: "pending",
      to_status: "cancelled",
      reason: "guest_cancelled",
    });

    const again = await pool.query("SELECT cancel_reservation($1, 240) AS outcome", [params.tokenHash]);
    expect(again.rows[0].outcome).toBeNull();

    const unknown = await pool.query("SELECT cancel_reservation($1, 240) AS outcome", [
      sha256Hex("never-created-token"),
    ]);
    expect(unknown.rows[0].outcome).toBeNull();
  });

  it("returns cutoff-passed for cancellations too close to the start", async () => {
    const params = futureParams(4);
    const created = await createViaSql(pool, params);
    expect(created.outcome).toBe("created");

    await pool.query(
      `UPDATE reservations
       SET starts_at = now() + interval '3 hours', ends_at = now() + interval '5 hours'
       WHERE id = $1`,
      [created.reservationId],
    );
    const outcome = await pool.query("SELECT cancel_reservation($1, 240) AS outcome", [
      params.tokenHash,
    ]);
    const value = outcome.rows[0].outcome;
    expect(value.outcome).toBe("cutoff-passed");
    expect(value.number).toBe(created.number);
    expect(value.status).toBe("pending");
  });

  it("expires stale pending holds idempotently", async () => {
    const params = futureParams(4);
    const created = await createViaSql(pool, params);
    expect(created.outcome).toBe("created");

    await pool.query("UPDATE reservations SET expires_at = now() - interval '1 second' WHERE id = $1", [
      created.reservationId,
    ]);
    const first = await pool.query("SELECT expire_reservations() AS n");
    expect(first.rows[0].n).toBeGreaterThanOrEqual(1);

    const row = await pool.query(`SELECT status, version FROM reservations WHERE id = $1`, [
      created.reservationId,
    ]);
    expect(row.rows[0]).toMatchObject({ status: "expired", version: 2 });

    const second = await pool.query("SELECT expire_reservations() AS n");
    expect(second.rows[0].n).toBe(0);
  });

  it("blocks illegal direct status transitions with the guard", async () => {
    const params = futureParams(4);
    const created = await createViaSql(pool, params);
    expect(created.outcome).toBe("created");

    await expect(
      pool.query("UPDATE reservations SET status = 'completed' WHERE id = $1", [created.reservationId]),
    ).rejects.toThrow(/invalid reservation status transition/);
  });

  it("denies reservations to anon and to the public function surface", async () => {
    const anonRead = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT count(*) FROM reservations"),
    );
    await expect(anonRead).rejects.toThrow(/keine Berechtigung|permission denied/i);

    const anonCall = withRole(databaseUrl, "anon", (client) =>
      client.query(
        `SELECT create_reservation_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          sha256Hex("anon-call"),
          sha256Hex("anon-call-idem"),
          sha256Hex("anon-call-req"),
          "Anna",
          "anna@example.com",
          "+49 170",
          RESERVATION_PRIVACY_VERSION,
          4,
          SERVICE_SLOT,
          SERVICE_END,
          null,
          null,
        ],
      ),
    );
    await expect(anonCall).rejects.toThrow(/keine Berechtigung|permission denied/i);
  });

  it("serves the full request flow through the service layer", async () => {
    const deps = serviceDeps(pool);
    const idempotencyKey = "9f1d21b0-0000-0000-0000-000000000001";
    const payload = {
      guestName: "Anna Mustermann",
      guestEmail: "anna@example.com",
      guestPhone: "+49 170 1234567",
      partySize: 4,
      slotStartUtc: SERVICE_SLOT,
      seatingPreference: "am Fenster",
      notes: "Geburtstag",
      privacyVersion: RESERVATION_PRIVACY_VERSION,
      privacyAccepted: true,
      idempotencyKey,
    };

    const created = await createReservationRequest(payload, deps);
    expect(created.status).toBe("created");
    if (created.status !== "created") return;
    expect(created.replayed).toBe(false);
    expect(created.reservation.partySize).toBe(4);
    expect(created.token).toBe(derivePublicReservationToken(SECRET, idempotencyKey));

    const replay = await createReservationRequest(payload, deps);
    expect(replay.status).toBe("created");
    if (replay.status !== "created") return;
    expect(replay.replayed).toBe(true);
    expect(replay.reservation.number).toBe(created.reservation.number);

    const withWrongPrivacy = await createReservationRequest(
      { ...payload, privacyAccepted: false },
      deps,
    );
    expect(withWrongPrivacy).toMatchObject({ status: "rejected", reason: "privacy-not-accepted" });

    const tooBig = await createReservationRequest({ ...payload, partySize: 13 }, deps);
    expect(tooBig).toMatchObject({ status: "rejected", reason: "input" });

    const staleSlot = await createReservationRequest(
      {
        ...payload,
        idempotencyKey: "9f1d21b0-0000-0000-0000-000000000099",
        slotStartUtc: "2026-11-10T10:00:00.000Z",
      },
      deps,
    );
    expect(staleSlot).toMatchObject({ status: "rejected", reason: "outside-hours" });

    const cancelled = await cancelPublicReservation(created.token, deps);
    expect(cancelled.status).toBe("cancelled");
    if (cancelled.status !== "cancelled") return;
    expect(cancelled.reservation.number).toBe(created.reservation.number);
  });
});
