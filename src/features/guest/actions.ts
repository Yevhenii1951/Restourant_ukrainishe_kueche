"use server";

import { headers } from "next/headers";
import { getServerPool } from "@/lib/db/serverPool";
import { mergeGuestAnfragen, GUEST_LOOKUP_SCHEMA, type GuestEntry } from "./domain";
import { createPostgresGuestStore } from "./store";

export type GuestLookupState =
  | { status: "idle" }
  | { status: "error"; code: "invalid-phone" | "rate-limited" | "service-unavailable" }
  | { status: "success"; entries: GuestEntry[] };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_BUCKETS = 1000;
const rateBuckets = new Map<string, number[]>();

function allowLookup(key: string, now: number): boolean {
  const recent = (rateBuckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    rateBuckets.set(key, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > MAX_BUCKETS) {
    for (const [bucketKey, times] of rateBuckets) {
      const kept = times.filter((ts) => now - ts < WINDOW_MS);
      if (kept.length === 0) rateBuckets.delete(bucketKey);
      else rateBuckets.set(bucketKey, kept);
    }
  }
  return true;
}

export async function lookupGuestAnfragen(
  _prev: GuestLookupState,
  formData: FormData,
): Promise<GuestLookupState> {
  const parsed = GUEST_LOOKUP_SCHEMA.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) return { status: "error", code: "invalid-phone" };

  const pool = getServerPool();
  if (!pool) return { status: "error", code: "service-unavailable" };

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowLookup(`${ip}:${parsed.data.phone}`, Date.now())) {
    return { status: "error", code: "rate-limited" };
  }

  const store = createPostgresGuestStore(pool);
  const [orders, reservations] = await Promise.all([
    store.listOrdersByPhone(parsed.data.phone),
    store.listReservationsByPhone(parsed.data.phone),
  ]);
  return { status: "success", entries: mergeGuestAnfragen(orders, reservations) };
}