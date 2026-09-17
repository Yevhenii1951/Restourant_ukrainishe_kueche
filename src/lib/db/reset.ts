import { Client } from "pg";

export const RESET_SCHEMAS = ["fixture", "app_private"];

export async function resetTestDatabase(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const schema of RESET_SCHEMAS) {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
  } finally {
    await client.end();
  }
}