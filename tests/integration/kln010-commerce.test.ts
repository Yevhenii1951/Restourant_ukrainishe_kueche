import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";

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

describe("KLN-010 server-authoritative quote primitives", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
  });

  it("hashes the demo promo code and resolves it to a percent rule", async () => {
    const row = await withRole(databaseUrl, "service_role", async (client) => {
      const { rows } = await client.query<{
        code_lookup: string;
        code_hash: string;
        mode: string;
        value_percent: number | null;
        value_cents: number | null;
        minimum_subtotal_cents: number;
      }>("SELECT code_lookup, code_hash, mode, value_percent, value_cents, minimum_subtotal_cents FROM promo_codes WHERE code_lookup = 'WELCOME10'");
      return rows[0];
    });
    expect(row.code_hash).toBe(
      "22b0493861832fff303c27eb48a8c1436174fb13675ced0361a01ae698154379",
    );
    expect(row.mode).toBe("percent");
    expect(row.value_percent).toBe(10);
    expect(row.minimum_subtotal_cents).toBe(1500);
  });

  it("seeds demo delivery zones with sealed PLZ lists and per-zone fees", async () => {
    const rows = await withRole(databaseUrl, "service_role", (client) =>
      client.query<{ name: string; postal_codes: string[]; fee_cents: number }>(
        "SELECT name, postal_codes, fee_cents FROM delivery_zones WHERE active ORDER BY name",
      ),
    );
    expect(rows.rowCount).toBe(2);
    const kassel = rows.rows.find((row) => row.name === "Kassel");
    expect(kassel?.postal_codes).toContain("34117");
    expect(kassel).not.toBeNull();
    expect(kassel!.postal_codes.every((plz) => plz.length === 5 && /^[0-9]{5}$/.test(plz))).toBe(
      true,
    );
  });

  it("rejects an active zone whose postal codes overlap an existing zone", async () => {
    const rejected = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO delivery_zones (name, postal_codes, fee_cents, minimum_cents, free_delivery_cents)
         VALUES ('Überlappung', ARRAY['34117'], 300, 1500, 3000)`,
      ),
    );
    await expect(rejected).rejects.toThrow(/overlap/i);
  });

  it("rejects malformed or duplicated postal codes in a zone", async () => {
    const malformed = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO delivery_zones (name, postal_codes, fee_cents, minimum_cents, free_delivery_cents)
         VALUES ('Kaputt', ARRAY['3411x'], 300, 1500, 3000)`,
      ),
    );
    await expect(malformed).rejects.toThrow(/five digits/i);

    const duplicated = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO delivery_zones (name, postal_codes, fee_cents, minimum_cents, free_delivery_cents)
         VALUES ('Doppelt', ARRAY['99999', '99999'], 300, 1500, 3000)`,
      ),
    );
    await expect(duplicated).rejects.toThrow(/unique/i);
  });

  it("allows an inactive zone to share codes but disallows overlaps when activated", async () => {
    const zoneId = "61000000-0000-0000-0000-000000000099";
    await withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO delivery_zones (id, name, postal_codes, fee_cents, minimum_cents, free_delivery_cents, active)
         VALUES ($1, 'Inaktiv', ARRAY['34117'], 300, 1500, 3000, false)`,
        [zoneId],
      ),
    );
    const rejected = withRole(databaseUrl, "service_role", (client) =>
      client.query("UPDATE delivery_zones SET active = true WHERE id = $1", [zoneId]),
    );
    await expect(rejected).rejects.toThrow(/overlap/i);
  });

  it("enforces exactly one weekly window or date override per service window", async () => {
    const invalid = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO service_windows (fulfilment, weekday, date_override, opens_at, closes_at, capacity_per_slot)
         VALUES ('pickup', 1, '2026-12-01', '11:30', '22:00', 8)`,
      ),
    );
    await expect(invalid).rejects.toThrow();
  });

  it("disallows a duplicate active date override for the same fulfilment", async () => {
    const first = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO service_windows (fulfilment, date_override, opens_at, closes_at, capacity_per_slot)
         VALUES ('pickup', '2026-12-24', '11:30', '22:00', 8)`,
      ),
    );
    await first;
    const duplicate = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO service_windows (fulfilment, date_override, opens_at, closes_at, capacity_per_slot)
         VALUES ('pickup', '2026-12-24', '11:30', '22:00', 8)`,
      ),
    );
    await expect(duplicate).rejects.toThrow();
  });

  it("seeds commerce settings consumed by the quote engine", async () => {
    const settings = await withRole(databaseUrl, "service_role", async (client) => {
      const { rows } = await client.query<{ key: string; value: number }>(
        "SELECT key, value FROM settings WHERE key IN ('pickup_minimum_cents', 'asap_lead_minutes', 'slot_interval_minutes', 'max_line_quantity')",
      );
      return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    });
    expect(settings).toEqual({
      pickup_minimum_cents: 0,
      asap_lead_minutes: 30,
      slot_interval_minutes: 15,
      max_line_quantity: 20,
    });
  });

  it("denies anon direct access to quote tables", async () => {
    const denied = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id FROM delivery_zones LIMIT 1"),
    );
    await expect(denied).rejects.toThrow();
  });

  it("denies anon access to settings and disclosure of promo codes", async () => {
    const deniedSettings = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT * FROM settings LIMIT 1"),
    );
    await expect(deniedSettings).rejects.toThrow();
    const deniedPromo = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT * FROM promo_codes LIMIT 1"),
    );
    await expect(deniedPromo).rejects.toThrow();
  });
});