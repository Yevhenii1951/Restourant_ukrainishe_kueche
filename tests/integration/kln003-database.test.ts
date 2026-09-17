import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import {
  DatabaseFuseError,
  resolveTestDatabaseUrl,
} from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";

async function countAsRole(databaseUrl: string, role: string): Promise<number> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`SET ROLE ${role}`);
    const result = await client.query(`SELECT * FROM fixture.private_secrets`);
    return result.rowCount ?? 0;
  } finally {
    await client.end();
  }
}

describe("KLN-003 database foundation", () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(
      process.env as Record<string, string | undefined>
    );
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
  });

  it("aborts the suite when the database URL is marked as development", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "development",
        TEST_DATABASE_URL: "postgresql://user@localhost:5432/kalyna_test",
      })
    ).toThrow(DatabaseFuseError);
  });

  it("aborts the suite when the database URL is a production Supabase ref", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "test",
        TEST_DATABASE_URL: "postgresql://postgres:password@db.xqjxhuhxjlxwbzpbodii.supabase.co:5432/postgres",
      })
    ).toThrow(DatabaseFuseError);
  });

  it("migrations and seeds are repeatable", async () => {
    const again = await runMigrations(databaseUrl);
    const seedsAgain = await runSeeds(databaseUrl);
    expect(again).toEqual([]);
    expect(seedsAgain).toEqual([]);
  });

  it("anon cannot access a private fixture table", async () => {
    expect(await countAsRole(databaseUrl, "anon")).toBe(0);
  });

  it("authenticated cannot access a private fixture table", async () => {
    expect(await countAsRole(databaseUrl, "authenticated")).toBe(0);
  });

  it("service_role can access the seeded private fixture table", async () => {
    expect(await countAsRole(databaseUrl, "service_role")).toBe(2);
  });
});