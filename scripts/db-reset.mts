import { resolveTestDatabaseUrl } from "../src/lib/db/fuse.ts";
import { resetTestDatabase } from "../src/lib/db/reset.ts";

const databaseUrl = resolveTestDatabaseUrl(
  process.env as Record<string, string | undefined>
);
await resetTestDatabase(databaseUrl);
console.log("Test database reset complete.");