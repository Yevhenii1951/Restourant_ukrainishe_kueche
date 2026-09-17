import { resolveTestDatabaseUrl } from "../src/lib/db/fuse.ts";
import { bootstrapRoles, runMigrations } from "../src/lib/db/runner.ts";

const databaseUrl = resolveTestDatabaseUrl(
  process.env as Record<string, string | undefined>
);
await bootstrapRoles(databaseUrl);
const applied = await runMigrations(databaseUrl);
console.log(
  `Migrations applied: ${applied.length === 0 ? "none (all current)" : applied.join(", ")}`
);