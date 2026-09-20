import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";

describe("KLN-022 audit and dashboard database projections", () => {
  let pool: Pool;

  beforeAll(async () => {
    const url = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(url);
    await resetTestDatabase(url);
    await runMigrations(url);
    await runSeeds(url);
    pool = new Pool({ connectionString: url });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("redacts PII and secrets from the append-only audit projection", async () => {
    await pool.query(
      `INSERT INTO audit_events (action, entity_type, after_data)
       VALUES ('test.audit', 'test', $1::jsonb)`,
      [JSON.stringify({ email: "guest@example.com", nested: { token: "secret", state: "accepted" } })],
    );
    const result = await pool.query<{ after_data: Record<string, unknown> }>(
      "SELECT after_data FROM admin_audit_events() WHERE action = 'test.audit'",
    );
    expect(result.rows[0].after_data).toEqual({ nested: { state: "accepted" } });
    await expect(pool.query("DELETE FROM audit_events WHERE action = 'test.audit'")).rejects.toThrow(/append-only/);
  });

  it("uses Europe/Berlin day boundaries and excludes cancelled or rejected orders", async () => {
    await pool.query(
      `INSERT INTO orders (public_token_hash, idempotency_hash, request_hash, fulfilment, payment_method, scheduled_for, privacy_version, state, subtotal_cents, discount_cents, tip_cents, total_cents)
       VALUES ('dash-a', 'dash-a', 'dash-a', 'pickup', 'cash_pickup', '2026-10-06T22:30:00Z', '1', 'completed', 1000, 0, 0, 1000),
              ('dash-b', 'dash-b', 'dash-b', 'pickup', 'cash_pickup', '2026-10-06T22:30:00Z', '1', 'cancelled', 900, 0, 0, 900),
              ('dash-c', 'dash-c', 'dash-c', 'pickup', 'cash_pickup', '2026-10-06T21:30:00Z', '1', 'rejected', 800, 0, 0, 800)`,
    );
    const result = await pool.query<{ order_count: number; revenue_cents: number }>(
      "SELECT order_count, revenue_cents FROM admin_dashboard_for_day('2026-10-07'::date)",
    );
    expect(result.rows.map((row) => ({ ...row, revenue_cents: Number(row.revenue_cents) }))).toEqual([{ order_count: 1, revenue_cents: 1000 }]);
  });
});
