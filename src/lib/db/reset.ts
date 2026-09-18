import { Client } from "pg";

export const RESET_SCHEMAS = ["fixture", "app_private", "public"];

export async function resetTestDatabase(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const schema of RESET_SCHEMAS) {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT USAGE ON SCHEMA public TO PUBLIC");
  } finally {
    await client.end();
  }
}
