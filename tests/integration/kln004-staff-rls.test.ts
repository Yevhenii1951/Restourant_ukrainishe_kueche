import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations } from "@/lib/db/runner";
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

describe("KLN-004 staff RLS enforcement", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as EnvSource);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);

    const owner = new Client({ connectionString: databaseUrl });
    await owner.connect();
    try {
      await owner.query(
        `INSERT INTO staff_profiles (auth_user_id, display_name, role)
         VALUES ('00000000-0000-0000-0000-000000000001', 'Alex', 'STAFF'),
                ('00000000-0000-0000-0000-000000000002', 'Dana', 'MANAGER')`,
      );
    } finally {
      await owner.end();
    }
  });

  it("denies anon and an authenticated session without identity", async () => {
    const anonQuery = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id FROM staff_profiles"),
    );
    await expect(anonQuery).rejects.toThrow();

    const authenticatedRows = await withRole(
      databaseUrl,
      "authenticated",
      (client) => client.query("SELECT id FROM staff_profiles"),
    );
    expect(authenticatedRows.rowCount).toBe(0);
  });

  it("lets an authenticated member see only their own profile", async () => {
    await withRole(databaseUrl, "authenticated", async (client) => {
      await client.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({ sub: "00000000-0000-0000-0000-000000000001" }),
      ]);
      const own = await client.query(
        "SELECT id, display_name FROM staff_profiles",
      );
      expect(own.rowCount).toBe(1);
      expect(own.rows[0].display_name).toBe("Alex");

      await client.query("SELECT set_config('request.jwt.claims', $1, false)", [
        JSON.stringify({ sub: "00000000-0000-0000-0000-000000000099" }),
      ]);
      const stranger = await client.query(
        "SELECT id, display_name FROM staff_profiles",
      );
      expect(stranger.rowCount).toBe(0);
    });
  });

  it("keeps at least one active admin under direct service writes", async () => {
    const isRejected = async (sql: string): Promise<boolean> => {
      try {
        await withRole(databaseUrl, "service_role", (client) =>
          client.query(sql),
        );
        return false;
      } catch {
        return true;
      }
    };

    await withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO staff_profiles (auth_user_id, display_name, role)
         VALUES ('00000000-0000-0000-0000-000000000010', 'Admin A', 'ADMIN')`,
      ),
    );
    expect(
      await isRejected(
        "UPDATE staff_profiles SET role = 'STAFF' WHERE display_name = 'Admin A'",
      ),
    ).toBe(true);

    await withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO staff_profiles (auth_user_id, display_name, role)
         VALUES ('00000000-0000-0000-0000-000000000011', 'Admin B', 'ADMIN')`,
      ),
    );
    expect(
      await isRejected(
        "UPDATE staff_profiles SET role = 'STAFF' WHERE display_name = 'Admin A'",
      ),
    ).toBe(false);
    expect(
      await isRejected(
        "UPDATE staff_profiles SET active = false WHERE display_name = 'Admin B'",
      ),
    ).toBe(true);
  });

  it("audit_events are append-only even for service_role writers", async () => {
    await withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `INSERT INTO audit_events (action, entity_type, correlation_id)
         VALUES ('staff.role.change', 'staff_profile', 'corr-1')`,
      ),
    );

    const isRejected = async (sql: string): Promise<boolean> => {
      try {
        await withRole(databaseUrl, "service_role", (client) =>
          client.query(sql),
        );
        return false;
      } catch {
        return true;
      }
    };

    expect(await isRejected("DELETE FROM audit_events")).toBe(true);
    expect(
      await isRejected(
        "UPDATE audit_events SET action = 'tampered' WHERE action = 'staff.role.change'",
      ),
    ).toBe(true);
  });

  it("service_role can select staff rows across RLS", async () => {
    const rows = await withRole(
      databaseUrl,
      "service_role",
      async (client) =>
        (
          await client.query(
            "SELECT id FROM staff_profiles ORDER BY display_name",
          )
        ).rows,
    );
    expect(rows).toHaveLength(4);
  });
});

type EnvSource = Record<string, string | undefined>;
