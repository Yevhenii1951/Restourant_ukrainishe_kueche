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

describe("KLN-007 typed content entries", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
  });

  it("anon reads only published content and German is canonical with Ukrainian absent", async () => {
    const rows = await withRole(databaseUrl, "anon", async (client) => {
      const { rows: result } = await client.query<{
        typed_key: string;
        payload: { hero: Record<string, string> };
      }>("SELECT typed_key, payload FROM content_entries_public ORDER BY typed_key");
      return result;
    });
    const home = rows.find((row) => row.typed_key === "home");
    expect(home).toBeDefined();
    expect(home!.payload.hero.de).toBeTruthy();
    expect(home!.payload.hero.uk).toBeUndefined();
    expect(rows.every((row) => ["home", "about", "faq", "lunch", "events", "gallery", "catering"].includes(row.typed_key))).toBe(true);
  });

  it("anon is denied direct access to the content table", async () => {
    const denied = withRole(databaseUrl, "anon", (client) =>
      client.query("SELECT id FROM content_entries LIMIT 1"),
    );
    await expect(denied).rejects.toThrow();
  });

  it("destructive delete is impossible even for service_role", async () => {
    const denied = withRole(databaseUrl, "service_role", (client) =>
      client.query("DELETE FROM content_entries WHERE typed_key = 'gallery'"),
    );
    await expect(denied).rejects.toThrow();
  });

  it("optimistic save rejects a stale overwrite", async () => {
    const { versions, staleCount } = await withRole(databaseUrl, "service_role", async (client) => {
      await client.query(
        `INSERT INTO content_entries (typed_key, payload)
         VALUES ('legal_agb',
                 '{"body":{"de":"Demo-AGB-Entwurf"}}'::jsonb)`,
      );
      const save = await client.query<{ version: number }>(
        `UPDATE content_entries
         SET payload = '{"body":{"de":"Demo-AGB v2"}}'::jsonb, version = version + 1
         WHERE typed_key = 'legal_agb' AND version = 1
         RETURNING version`,
      );
      const stale = await client.query(
        `UPDATE content_entries
         SET payload = '{"body":{"de":"Demo-AGB stale"}}'::jsonb, version = version + 1
         WHERE typed_key = 'legal_agb' AND version = 1`,
      );
      return { versions: save.rows[0].version, staleCount: stale.rowCount };
    });
    expect(versions).toBe(2);
    expect(staleCount).toBe(0);
  });

  it("publishing a version makes it public and archive hides it again", async () => {
    await withRole(databaseUrl, "service_role", async (client) => {
      await client.query(
        `UPDATE content_entries
         SET publication_state = 'published',
             published_payload = payload,
             published_version = version
         WHERE typed_key = 'legal_agb' AND version = 2`,
      );
    });
    const published = await withRole(databaseUrl, "anon", async (client) => {
      const { rows } = await client.query<{ typed_key: string; payload: { body: Record<string, string> } }>(
        "SELECT typed_key, payload FROM content_entries_public WHERE typed_key = 'legal_agb'",
      );
      return rows;
    });
    expect(published).toHaveLength(1);
    expect(published[0].payload.body.de).toBe("Demo-AGB v2");

    await withRole(databaseUrl, "service_role", async (client) => {
      await client.query(
        `UPDATE content_entries
         SET payload = '{"body":{"de":"Demo-AGB v3 draft"}}'::jsonb, version = version + 1
         WHERE typed_key = 'legal_agb' AND version = 2`,
      );
    });
    const afterDraftSave = await withRole(databaseUrl, "anon", async (client) => {
      const { rows } = await client.query<{ payload: { body: Record<string, string> } }>(
        "SELECT payload FROM content_entries_public WHERE typed_key = 'legal_agb'",
      );
      return rows;
    });
    expect(afterDraftSave[0].payload.body.de).toBe("Demo-AGB v2");

    await withRole(databaseUrl, "service_role", async (client) => {
      await client.query(
        "UPDATE content_entries SET publication_state = 'archived', published_payload = NULL WHERE typed_key = 'legal_agb'",
      );
    });
    const archived = await withRole(databaseUrl, "anon", async (client) => {
      const { rows } = await client.query<{ typed_key: string }>(
        "SELECT typed_key FROM content_entries_public WHERE typed_key = 'legal_agb'",
      );
      return rows;
    });
    expect(archived).toHaveLength(0);
  });

  it("a published entry always has published content", async () => {
    const blocked = withRole(databaseUrl, "service_role", (client) =>
      client.query(
        `UPDATE content_entries
         SET publication_state = 'published', published_payload = NULL
         WHERE typed_key = 'gallery'`,
      ),
    );
    await expect(blocked).rejects.toThrow();
  });
});