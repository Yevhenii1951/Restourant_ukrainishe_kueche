import "server-only";
import type { Pool } from "pg";
import { serverEnv } from "@/lib/env/server";
import { getServerPool } from "@/lib/db/serverPool";
import { createPostgresReservationStore } from "./postgresReservationStore";
import type { ReservationRequestServiceDeps } from "./requestService";

export function getReservationPool(): Pool | null {
  return getServerPool();
}

export function createReservationRequestRuntime(): ReservationRequestServiceDeps | null {
  const dbPool = getReservationPool();
  if (!dbPool || !serverEnv.QUOTE_SIGNING_SECRET) return null;
  return {
    pool: dbPool,
    secret: serverEnv.QUOTE_SIGNING_SECRET,
    store: createPostgresReservationStore(dbPool),
  };
}
