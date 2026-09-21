import { readFileSync } from "node:fs";
import { z } from "zod";
import { bootstrapRoles, runMigrations } from "../src/lib/db/runner.ts";

function localDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    return readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const environment = z.object({
  DATABASE_URL: z.string().min(1),
}).safeParse({ DATABASE_URL: localDatabaseUrl() });

if (!environment.success) throw new Error("DATABASE_URL is required for local migrations.");
const databaseUrl = environment.data.DATABASE_URL;
const unixSocketUrl = /^postgres(?:ql)?:\/\/[^/]+@\/kalyna_dev\?host=\/var\/run\/postgresql$/.test(databaseUrl);
const parsed = unixSocketUrl ? null : new URL(databaseUrl);
if (!unixSocketUrl && (!parsed || !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) || parsed.pathname !== '/kalyna_dev')) {
  throw new Error("DATABASE_URL must target local database kalyna_dev.");
}

await bootstrapRoles(environment.data.DATABASE_URL);
const applied = await runMigrations(environment.data.DATABASE_URL);
console.log(`Local migrations applied: ${applied.length === 0 ? "none (all current)" : applied.join(", ")}`);
