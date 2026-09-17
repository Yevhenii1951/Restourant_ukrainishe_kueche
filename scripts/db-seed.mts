import { resolveTestDatabaseUrl } from "../src/lib/db/fuse.ts";
import { runSeeds } from "../src/lib/db/runner.ts";

const databaseUrl = resolveTestDatabaseUrl(
  process.env as Record<string, string | undefined>
);
const applied = await runSeeds(databaseUrl);
console.log(
  `Seeds applied: ${applied.length === 0 ? "none (all current)" : applied.join(", ")}`
);