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
  it("creates and accepts a provider-backed invitation", async () => {
    const result = await withRole(
      databaseUrl,
      "service_role",
      async (client) => {
        const inviter = await client.query(
          "SELECT id FROM staff_profiles WHERE auth_user_id = $1",
          ["00000000-0000-0000-0000-000000000001"],
        );
        await client.query(
          "SELECT create_staff_invitation_with_audit($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            "00000000-0000-0000-0000-000000000030",
            "00000000-0000-0000-0000-000000000031",
            "invitee@example.com",
            "Invitee",
            "STAFF",
            null,
            null,
            inviter.rows[0].id,
            "corr-invite",
          ],
        );
        await client.query("SELECT mark_staff_invitation_accepted($1)", [
          "00000000-0000-0000-0000-000000000031",
        ]);
        return client.query(
          `SELECT p.role, i.accepted_at, a.after_data
         FROM staff_profiles p
         JOIN staff_invitations i ON i.auth_user_id = p.auth_user_id
         JOIN audit_events a ON a.correlation_id = 'corr-invite'
         WHERE p.auth_user_id = '00000000-0000-0000-0000-000000000031'`,
        );
      },
    );

    expect(result.rows[0].role).toBe("STAFF");
    expect(result.rows[0].accepted_at).toBeInstanceOf(Date);
    expect(result.rows[0].after_data).toEqual({ role: "STAFF" });
  });

  it("changes a role and appends its audit atomically", async () => {
    await withRole(databaseUrl, "service_role", (client) =>
      client.query(
        "SELECT change_staff_role_with_audit((SELECT id FROM staff_profiles WHERE auth_user_id = $1), $2, $3, $4)",
        ["00000000-0000-0000-0000-000000000001", "MANAGER", null, "corr-rpc"],
      ),
    );

    const result = await withRole(
      databaseUrl,
      "service_role",
      async (client) => ({
        profile: await client.query(
          "SELECT role FROM staff_profiles WHERE auth_user_id = $1",
          ["00000000-0000-0000-0000-000000000001"],
        ),
        audit: await client.query(
          "SELECT after_data FROM audit_events WHERE correlation_id = $1",
          ["corr-rpc"],
        ),
      }),
    );
    expect(result.profile.rows[0].role).toBe("MANAGER");
    expect(result.audit.rows[0].after_data).toEqual({ role: "MANAGER" });
  });
});

type EnvSource = Record<string, string | undefined>;
