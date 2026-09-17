import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";

export const TRACKING_SCHEMA = "app_private";

export async function bootstrapRoles(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const sql = await fs.readFile(
      path.join(process.cwd(), "db", "bootstrap_roles.sql"),
      "utf8"
    );
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function runSqlFiles(
  databaseUrl: string,
  dir: string,
  trackingTable: string,
  dirLabel: string
): Promise<string[]> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS ${TRACKING_SCHEMA}`
    );
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${TRACKING_SCHEMA}.${trackingTable} (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`
    );

    const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".sql")).sort();

    if (files.length === 0) {
      throw new Error(`No .sql files found in ${dir}`);
    }

    const appliedRows = await client.query(
      `SELECT filename FROM ${TRACKING_SCHEMA}.${trackingTable}`
    );
    const applied = new Set<string>(appliedRows.rows.map((row) => row.filename));

    const appliedNow: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${TRACKING_SCHEMA}.${trackingTable} (filename) VALUES ($1)`,
          [file]
        );
        await client.query("COMMIT");
        appliedNow.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${dirLabel} ${file} failed: ${(error as Error).message}`);
      }
    }
    return appliedNow;
  } finally {
    await client.end();
  }
}

export async function runMigrations(databaseUrl: string): Promise<string[]> {
  const dir = path.join(process.cwd(), "db", "migrations");
  return runSqlFiles(databaseUrl, dir, "schema_migrations", "Migration");
}

export async function runSeeds(databaseUrl: string): Promise<string[]> {
  const dir = path.join(process.cwd(), "db", "seeds");
  return runSqlFiles(databaseUrl, dir, "schema_seeds", "Seed");
}