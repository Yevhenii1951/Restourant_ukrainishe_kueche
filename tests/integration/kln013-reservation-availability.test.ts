import { beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { getReservationSlotsFromStore } from "@/features/reservation/availability";
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
        "SELECT id, internal_label, capacity, area, active FROM restaurant_tables ORDER BY internal_label",
      );
      return rows.map((row) => ({
        id: row.id,
        internalLabel: row.internal_label,
        capacity: row.capacity,
        area: row.area,
        active: row.active,
      }));
    },

    async listCombinations() {
      const { rows } = await pool.query(
        `SELECT c.id, c.name, c.capacity, c.active,
                COALESCE(array_agg(m.table_id ORDER BY m.table_id) FILTER (WHERE m.table_id IS NOT NULL), '{}') AS member_ids
         FROM table_combinations c
         LEFT JOIN table_combination_members m ON m.combination_id = c.id
         GROUP BY c.id
         ORDER BY c.name`,
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        capacity: row.capacity,
        active: row.active,
        memberTableIds: row.member_ids,
      }));
    },

    async listReservationWindows() {
      const { rows } = await pool.query(
        `SELECT weekday, date_override, opens_at, closes_at, active
         FROM service_windows WHERE fulfilment = 'reservation'`,
      );
      return rows.map((row) => ({
        weekday: row.weekday,
        dateOverride: row.date_override,
        opensAt: String(row.opens_at).slice(0, 5),
        closesAt: String(row.closes_at).slice(0, 5),
        active: row.active,
      }));
    },

    async listReservationClosures() {
      const { rows } = await pool.query(`SELECT starts_at, ends_at, affected_services FROM closures`);
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

describe("KLN-013 reservation availability against the database", () => {
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

  it("seeds the demo table inventory and computes combination capacity", async () => {
    const tables = await withRole(databaseUrl, "service_role", async (client) => {
      const { rows } = await client.query(
        "SELECT id, internal_label, capacity, area, active FROM restaurant_tables ORDER BY internal_label",
      );
      return rows;
    });
    expect(tables).toHaveLength(4);
    const fenster2 = tables.find((row) => row.internal_label === "Fenster 2");
    expect(fenster2?.capacity).toBe(2);

    const combos = await withRole(databaseUrl, "service_role", async (client) => {
      const { rows } = await client.query(
        "SELECT c.name, c.capacity, count(m.table_id)::int AS n FROM table_combinations c JOIN table_combination_members m ON m.combination_id = c.id GROUP BY c.id ORDER BY c.name",
      );
      return rows;
    });
    expect(combos.find((row) => row.name === "Saal Fenster")).toMatchObject({ capacity: 6, n: 2 });
    expect(combos.find((row) => row.name === "Loggia gross")).toMatchObject({ capacity: 10, n: 2 });
  });

  it("recomputes combination capacity when an active member table is deactivated", async () => {
    const fenster4 = "80000000-0000-0000-0000-000000000002";
    await withRole(databaseUrl, "service_role", (client) =>
      client.query("UPDATE restaurant_tables SET active = false WHERE id = $1", [fenster4]),
    );
    const after = await withRole(databaseUrl, "service_role", async (client) => {
      const { rows } = await client.query(
        "SELECT capacity FROM table_combinations WHERE name = 'Saal Fenster'",
      );
      return rows[0].capacity;
    });
    expect(after).toBe(2);
    await withRole(databaseUrl, "service_role", (client) =>
      client.query("UPDATE restaurant_tables SET active = true WHERE id = $1", [fenster4]),
    );
    const restored = await withRole(databaseUrl, "service_role", async (client) => {
      const { rows } = await client.query(
        "SELECT capacity FROM table_combinations WHERE name = 'Saal Fenster'",
      );
      return rows[0].capacity;
    });
    expect(restored).toBe(6);
  });

  it("keeps the table inventory out of anon and authenticated access", async () => {
    const anonRead = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT count(*) FROM restaurant_tables"),
    );
    await expect(anonRead).rejects.toThrow(/keine Berechtigung|permission denied/i);
    const anonWrite = withRole(databaseUrl, "anon", (client) =>
      client.query(
        "INSERT INTO restaurant_tables (internal_label, capacity, area) VALUES ('X', 2, 'Saal')",
      ),
    );
    await expect(anonWrite).rejects.toThrow(/keine Berechtigung|permission denied/i);
  });

  it("finds only open non-overlapping slots and keeps table identity private", async () => {
    const closure = {
      id: "81000000-0000-0000-0000-000000000099",
      startsAt: "2026-10-07T12:00:00.000Z",
      endsAt: "2026-10-07T13:00:00.000Z",
    };
    await pool.query(
      `INSERT INTO closures (id, starts_at, ends_at, reason, affected_services)
       VALUES ($1, $2, $3, 'Test-Schließung', ARRAY['reservation']::commercial_service_type[])`,
      [closure.id, closure.startsAt, closure.endsAt],
    );

    const now = new Date("2026-10-07T08:00:00.000Z");
    const store = poolStore(pool);
    const result = await getReservationSlotsFromStore(
      { date: "2026-10-07", partySize: 4 },
      now,
      { store },
    );

    await pool.query("DELETE FROM closures WHERE id = $1", [closure.id]);

    expect(result.status).toBe("slots");
    if (result.status !== "slots") return;

    // Two-hour reservations starting strictly after 12:00 and before 15:00
    // overlap the half-open closure [14:00, 15:00) local and must disappear.
    const blockedLabels = new Set<string>();
    for (let minute = 15; minute <= 165; minute += 15) {
      const offset = 12 * 60 + minute;
      const hours = String(Math.floor(offset / 60)).padStart(2, "0");
      const mins = String(offset % 60).padStart(2, "0");
      blockedLabels.add(`${hours}:${mins}`);
    }
    expect(result.slots).toHaveLength(26);
    for (const slot of result.slots) {
      expect(Object.keys(slot).sort()).toEqual(["labelLocal", "startUtc"]);
      if (blockedLabels.has(slot.labelLocal)) {
        throw new Error(`Schließung wurde ignoriert für ${slot.labelLocal}`);
      }
    }
    // The reservation ending exactly when the closure starts stays available
    // (half-open range semantics).
    expect(result.slots.some((slot) => slot.labelLocal === "12:00")).toBe(true);
  });

  it("rejects a request above the seeded maximum party size", async () => {
    const result = await getReservationSlotsFromStore(
      { date: "2026-10-07", partySize: 99 },
      new Date("2026-10-07T08:00:00.000Z"),
      { store: poolStore(pool) },
    );
    expect(result).toEqual({ status: "rejected", reason: "party-too-large" });
  });
});
