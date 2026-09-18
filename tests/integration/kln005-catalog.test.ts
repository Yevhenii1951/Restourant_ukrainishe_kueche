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

describe("KLN-005 public catalog", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
  });

  it("anon can read the public menu view", async () => {
    const rows = await withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id, slug, base_price_cents, name_localized FROM menu_items_public"),
    );
    expect(rows.rowCount).toBeGreaterThanOrEqual(1);
  });

  it("only published and available items appear in the public view", async () => {
    const slugs = await withRole(databaseUrl, "anon", async (client) => {
      const { rows } = await client.query<{ slug: string }>(
        "SELECT slug FROM menu_items_public ORDER BY sort_order",
      );
      return rows.map((r) => r.slug);
    });
    expect(slugs).toContain("borschtsch");
    expect(slugs).not.toContain("medivnyk"); // draft
    expect(slugs).not.toContain("kwas"); // archived
  });

  it("published item exposes price, portion and allergen labels for German", async () => {
    const row = await withRole(databaseUrl, "anon", async (client) => {
      const { rows } = await client.query<{
        base_price_cents: number;
        portion_label_localized: Record<string, string>;
        name_localized: Record<string, string>;
        allergens: { code: string; label_localized: Record<string, string>; containment: string }[];
      }>(
        `SELECT base_price_cents, portion_label_localized, name_localized, allergens
         FROM menu_items_public WHERE slug = 'borschtsch' LIMIT 1`,
      );
      return rows[0];
    });
    expect(row.base_price_cents).toBe(790);
    expect(row.portion_label_localized.de).toBeTruthy();
    expect(row.name_localized.de).toBe("Borschtsch");
    expect(row.allergens.length).toBeGreaterThanOrEqual(1);
    const milk = row.allergens.find((a) => a.code === "milk");
    expect(milk).toBeDefined();
    expect(milk!.containment).toBe("contains");
    expect(milk!.label_localized.de).toBeTruthy();
  });

  it("allergens reference view lists all 14 EU allergens", async () => {
    const rows = await withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT code FROM allergens_reference ORDER BY code"),
    );
    expect(rows.rowCount).toBe(14);
  });

  it("anon is denied direct access to underlying catalog tables", async () => {
    const denied = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id FROM menu_items LIMIT 1"),
    );
    await expect(denied).rejects.toThrow();
  });

  it("anon is denied direct access to menu_item_allergens", async () => {
    const denied = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT * FROM menu_item_allergens LIMIT 1"),
    );
    await expect(denied).rejects.toThrow();
  });

  it("service_role can access underlying catalog tables", async () => {
    const rows = await withRole(databaseUrl, "service_role", (client) =>
      client.query("SELECT id FROM menu_items"),
    );
    expect(rows.rowCount).toBeGreaterThanOrEqual(1);
  });

  it("publication guard rejects publishing without allergen review", async () => {
    const rejected = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        "UPDATE menu_items SET publication_state = 'published' WHERE slug = 'medivnyk'",
      ),
    );
    await expect(rejected).rejects.toThrow(/allergen/i);
  });

  it("publication succeeds after allergen review and item appears in view", async () => {
    await withRole(databaseUrl, "service_role", async (client) => {
      await client.query(
        "UPDATE menu_items SET allergen_reviewed = true WHERE slug = 'medivnyk'",
      );
      await client.query(
        "UPDATE menu_items SET publication_state = 'published' WHERE slug = 'medivnyk'",
      );
    });
    const found = await withRole(databaseUrl, "anon", async (client) => {
      const { rows } = await client.query<{ slug: string }>(
        "SELECT slug FROM menu_items_public WHERE slug = 'medivnyk'",
      );
      return rows;
    });
    expect(found).toHaveLength(1);
  });
});
