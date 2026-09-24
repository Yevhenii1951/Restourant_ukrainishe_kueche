import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { createPostgresReservationStore } from "@/features/reservation/postgresReservationStore";
import { insertAuditEvent } from "@/lib/db/audit";
import { createPostgresStaffStore } from "@/features/identity/postgresStaffStore";

vi.mock("server-only", () => ({}));

describe("KLN-033 pool-first staff/admin stores", () => {
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

  afterAll(async () => {
    await pool.end();
  });

  it("writes and reads a table through the pool-based store", async () => {
    const store = createPostgresReservationStore(pool);
    const created = await store.saveTable({
      internalLabel: "Testtisch Pool",
      capacity: 3,
      area: "Saal",
      active: true,
    });
    expect(created.internalLabel).toBe("Testtisch Pool");
    expect(created.capacity).toBe(3);

    const updated = await store.saveTable({
      id: created.id,
      internalLabel: "Testtisch Pool geupdatet",
      capacity: 4,
      area: "Loggia",
      active: false,
    });
    expect(updated.capacity).toBe(4);
    expect(updated.active).toBe(false);

    const list = await store.listTables();
    const persisted = list.find((row) => row.id === created.id);
    expect(persisted?.internalLabel).toBe("Testtisch Pool geupdatet");

    await pool.query("DELETE FROM restaurant_tables WHERE id = $1", [created.id]);
  });

  it("creates and reconfigures a combination with trigger-maintained capacity", async () => {
    const store = createPostgresReservationStore(pool);
    const fenster2 = "80000000-0000-0000-0000-000000000001";
    const fenster4 = "80000000-0000-0000-0000-000000000002";

    const created = await store.saveCombination({
      name: "Pool Kombination",
      active: true,
      memberTableIds: [fenster2, fenster4],
    });
    expect(created.memberTableIds.sort()).toEqual([fenster2, fenster4].sort());
    expect(created.capacity).toBe(6);

    const toggled = await store.saveCombination({
      id: created.id,
      name: "Pool Kombination",
      active: false,
      memberTableIds: [fenster2],
    });
    expect(toggled.active).toBe(false);
    expect(toggled.memberTableIds).toEqual([fenster2]);
    expect(toggled.capacity).toBe(2);

    await pool.query("DELETE FROM table_combination_members WHERE combination_id = $1", [created.id]);
    await pool.query("DELETE FROM table_combinations WHERE id = $1", [created.id]);
  });

  it("reads a staff profile through the pool-based staff store", async () => {
    const authUserId = "00000000-0000-0000-0000-000000000033";
    await pool.query(
      `INSERT INTO staff_profiles (auth_user_id, display_name, role)
       VALUES ($1, 'pool-staff', 'ADMIN')`,
      [authUserId],
    );
    const store = createPostgresStaffStore(pool);
    const staff = await store.listStaff();
    const profile = staff.find((entry) => entry.authUserId === authUserId);
    expect(profile?.displayName).toBe("pool-staff");
    await pool.query("DELETE FROM staff_profiles WHERE auth_user_id = $1", [authUserId]);
  });

  it("writes an audit event through the shared pool helper", async () => {
    const authUserId = "00000000-0000-0000-0000-000000000034";
    await pool.query(
      `INSERT INTO staff_profiles (auth_user_id, display_name, role)
       VALUES ($1, 'audit-staff', 'ADMIN')`,
      [authUserId],
    );
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM staff_profiles WHERE auth_user_id = $1",
      [authUserId],
    );
    const correlationId = "kln033-test";
    await insertAuditEvent(pool, {
      actorId: rows[0].id,
      action: "operations.closure.create",
      entityType: "closure",
      entityId: null,
      afterData: { note: "kln033 smoke" },
      correlationId,
    });
    const auditRows = await pool.query<{ correlation_id: string }>(
      "SELECT correlation_id FROM audit_events WHERE correlation_id = $1",
      [correlationId],
    );
    expect(auditRows.rows).toHaveLength(1);
    await pool.query("DELETE FROM staff_profiles WHERE auth_user_id = $1", [authUserId]);
  });
});