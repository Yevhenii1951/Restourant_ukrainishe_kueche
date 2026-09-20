import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { RESERVATION_PRIVACY_VERSION, sha256Hex } from "@/features/reservation/request";

const ACTOR_ID = "00000000-0000-0000-0000-0000000000f1";
let seq = 0;

function hashes(tag: string): [string, string, string] {
  return [sha256Hex(`token-${tag}`), sha256Hex(`idem-${tag}`), sha256Hex(`req-${tag}`)];
}

function slot(dayOffset: number): { start: string; end: string } {
  const startMs = Date.parse("2026-11-10T17:00:00.000Z") + dayOffset * 24 * 60 * 60 * 1000;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + 2 * 60 * 60 * 1000).toISOString(),
  };
}

describe("KLN-015 staff reservation operations", () => {
  let pool: Pool;

  beforeAll(async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query(
      `INSERT INTO staff_profiles (id, auth_user_id, display_name, role, active)
       VALUES ($1, $2, 'Testmanager', 'MANAGER', true)`,
      [ACTOR_ID, "00000000-0000-0000-0000-0000000000fd"],
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createReservation(partySize: number, when = slot(++seq)): Promise<{ id: string; number: number; version: number; start: string; end: string }> {
    const tag = `${partySize}-${seq}-${Math.random()}`;
    const result = await pool.query<{ outcome: { outcome: string; reservationId: string; number: number } }>(
      `SELECT create_reservation_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) AS outcome`,
      [
        ...hashes(tag),
        "Anna Mustermann",
        "anna@example.com",
        "+49 170 1234567",
        RESERVATION_PRIVACY_VERSION,
        partySize,
        when.start,
        when.end,
        null,
        null,
      ],
    );
    expect(result.rows[0].outcome.outcome).toBe("created");
    return { id: result.rows[0].outcome.reservationId, number: result.rows[0].outcome.number, version: 1, start: when.start, end: when.end };
  }

  async function transition(id: string, version: number, status: string, reason: string | null = null) {
    return pool.query<{ apply_reservation_transition: Record<string, unknown> | null }>(
      `SELECT apply_reservation_transition($1::uuid, $2, $3::reservation_state, $4, $5::uuid, $6)`,
      [id, version, status, reason, ACTOR_ID, "corr-kln015"],
    );
  }

  it("applies valid transitions and audits conflicts/invalid attempts", async () => {
    const reservation = await createReservation(4);
    const confirmed = await transition(reservation.id, 1, "confirmed");
    expect(confirmed.rows[0].apply_reservation_transition).toMatchObject({
      status: "applied",
      reservationStatus: "confirmed",
      version: 2,
    });

    const stale = await transition(reservation.id, 1, "cancelled", "too late");
    expect(stale.rows[0].apply_reservation_transition).toMatchObject({ status: "conflict", version: 2 });

    const invalid = await transition(reservation.id, 2, "declined", "wrong edge");
    expect(invalid.rows[0].apply_reservation_transition).toMatchObject({ status: "invalid" });

    const events = await pool.query(
      `SELECT from_status, to_status, actor FROM reservation_status_events
       WHERE reservation_id = $1 ORDER BY created_at`,
      [reservation.id],
    );
    expect(events.rows).toContainEqual({ from_status: "pending", to_status: "confirmed", actor: ACTOR_ID });

    const audit = await pool.query<{ action: string }>(
      `SELECT action FROM audit_events WHERE entity_type = 'reservation' AND entity_id = $1 ORDER BY created_at`,
      [reservation.id],
    );
    expect(audit.rows.map((row) => row.action)).toEqual([
      "reservation.transition.apply",
      "reservation.transition.conflict",
      "reservation.transition.invalid",
    ]);
  });

  it("rechecks an expired hold atomically and fails without overlap", async () => {
    const when = slot(++seq);
    const expired = await createReservation(10, when);
    await pool.query(
      "UPDATE reservations SET expires_at = now() - interval '1 second' WHERE id = $1",
      [expired.id],
    );
    await pool.query("UPDATE reservation_allocations SET blocked = false WHERE reservation_id = $1", [expired.id]);

    const competing = await createReservation(10, when);
    const confirmedCompeting = await transition(competing.id, 1, "confirmed");
    expect(confirmedCompeting.rows[0].apply_reservation_transition).toMatchObject({ status: "applied" });

    const failed = await transition(expired.id, 1, "confirmed");
    expect(failed.rows[0].apply_reservation_transition).toMatchObject({
      status: "no-table-available",
      version: 1,
    });

    const original = await pool.query<{ status: string; version: number }>(
      "SELECT status, version FROM reservations WHERE id = $1",
      [expired.id],
    );
    expect(original.rows[0]).toEqual({ status: "pending", version: 1 });

    const blocking = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM reservation_allocations
       WHERE starts_at = $1 AND ends_at = $2 AND blocked`,
      [when.start, when.end],
    );
    expect(blocking.rows[0].n).toBe(2);
  });
});
