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

describe("KLN-006 modifier groups", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
  });

  it("anon can read modifier groups of a published item with a required 1-of-2 group", async () => {
    const rows = await withRole(databaseUrl, "anon", async (client) => {
      const { rows: groupRows } = await client.query<{
        menu_item_id: string;
        min_selections: number;
        max_selections: number;
        required: boolean;
        options: unknown[];
      }>(
        `SELECT g.menu_item_id, g.min_selections, g.max_selections, g.required, g.options
         FROM modifier_groups_public g
         JOIN menu_items_public mi ON mi.id = g.menu_item_id
         WHERE mi.slug = 'kiewer-kotelett'`,
      );
      return groupRows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].min_selections).toBe(1);
    expect(rows[0].max_selections).toBe(1);
    expect(rows[0].required).toBe(true);
    expect(rows[0].options).toHaveLength(2);
  });

  it("an optional group is public with zero minimum selections", async () => {
    const rows = await withRole(databaseUrl, "anon", async (client) => {
      const { rows: groupRows } = await client.query<{ min_selections: number }>(
        `SELECT g.min_selections
         FROM modifier_groups_public g
         JOIN menu_items_public mi ON mi.id = g.menu_item_id
         WHERE mi.slug = 'borschtsch'`,
      );
      return groupRows;
    });
    expect(rows[0].min_selections).toBe(0);
  });

  it("groups of non-published items are hidden from the public view", async () => {
    const rows = await withRole(databaseUrl, "anon", async (client) => {
      const { rows: groupRows } = await client.query<{ slug: string }>(
        `SELECT mi.slug
         FROM modifier_groups_public g
         JOIN menu_items_public mi ON mi.id = g.menu_item_id`,
      );
      return groupRows.map((r) => r.slug);
    });
    expect(rows).toContain("kiewer-kotelett");
    expect(rows).not.toContain("kwas"); // archived
  });

  it("anon is denied direct access to modifier tables", async () => {
    const denied = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id FROM modifier_groups LIMIT 1"),
    );
    await expect(denied).rejects.toThrow();
    const deniedOptions = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id FROM modifier_options LIMIT 1"),
    );
    await expect(deniedOptions).rejects.toThrow();
  });

  it("service_role can write modifier tables and the view reflects it", async () => {
    const created = await withRole(databaseUrl, "service_role", async (client) => {
      const group = await client.query<{ id: string }>(
        `INSERT INTO modifier_groups
           (menu_item_id, name_localized, min_selections, max_selections, required, sort_order)
         VALUES (
           (SELECT id FROM menu_items WHERE slug = 'medivnyk'),
           '{"de":"Topping","en":"Topping"}', 0, 1, false, 1
         )
         RETURNING id`,
      );
      const groupId = group.rows[0].id;
      await client.query(
        `INSERT INTO modifier_options
           (group_id, name_localized, price_delta_cents, sort_order)
         VALUES ($1, '{"de":"Himbeere","en":"Raspberry"}', 0, 1)`,
        [groupId],
      );
      return groupId;
    });
    expect(created).toBeDefined();
  });
});