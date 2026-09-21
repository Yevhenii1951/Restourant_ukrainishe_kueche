import "server-only";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env/server";

let pool: Pool | null | undefined;

export function getServerPool(): Pool | null {
  if (pool !== undefined) return pool;
  if (!serverEnv.DATABASE_URL) {
    pool = null;
    return pool;
  }
  const created = new Pool({ connectionString: serverEnv.DATABASE_URL, max: 5 });
  created.on("error", () => {});
  pool = created;
  return pool;
}
