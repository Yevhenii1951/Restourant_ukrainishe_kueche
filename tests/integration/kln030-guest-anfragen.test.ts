import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { RESERVATION_PRIVACY_VERSION, sha256Hex } from "@/features/reservation/request";
import { PRIVACY_VERSION } from "@/features/order/domain";
import { createPostgresGuestStore } from "@/features/guest/store";
import { mergeGuestAnfragen } from "@/features/guest/domain";

const PHONE_A = "+49 170 1234567";
const PHONE_B = "+49 171 7654321";

let tokenSeq = 0;
function freshHashes(): { tokenHash: string; idempotencyHash: string; requestHash: string } {
  tokenSeq += 1;
  const tag = `kln30-test-${tokenSeq}`;
  return {
    tokenHash: sha256Hex(tag),
    idempotencyHash: sha256Hex(`idem-${tag}`),
    requestHash: sha256Hex(`req-${tag}`),
  };
}

describe("KLN-030 guest lookup by phone against the database", () => {
  let databaseUrl: string;
  let pool: Pool;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("returns only the phone owner's orders and reservations", async () => {
    async function insertOrder(
      phone: string,
      createdAt: string,
    ): Promise<number> {
      const hashes = freshHashes();
      const { rows } = await pool.query(
        `INSERT INTO orders (
           public_token_hash, idempotency_hash, request_hash, fulfilment, payment_method,
           scheduled_for, guest_name, guest_phone, privacy_version,
           subtotal_cents, discount_cents, delivery_fee_cents, tip_cents, total_cents, created_at
         ) VALUES ($1,$2,$3,'pickup','cash_pickup','2026-11-10T17:00:00+00','Oleg Petrenko',$4,$5,
           1500,0,0,0,1500,$6)
         RETURNING order_number`,
        [hashes.tokenHash, hashes.idempotencyHash, hashes.requestHash, phone, PRIVACY_VERSION, createdAt],
      );
      return Number(rows[0].order_number);
    }

    async function insertReservation(
      phone: string,
      createdAt: string,
    ): Promise<number> {
      const hashes = freshHashes();
      const { rows } = await pool.query(
        `INSERT INTO reservations (
           public_token_hash, idempotency_hash, request_hash, guest_name, guest_email,
           guest_phone, privacy_version, party_size, starts_at, ends_at, expires_at, created_at
         ) VALUES ($1,$2,$3,'Anna Mustermann','anna@example.com',$4,$5,2,
           '2026-11-11T18:00:00+00','2026-11-11T20:00:00+00','2026-10-09T00:00:00+00',$6)
         RETURNING reservation_number`,
        [hashes.tokenHash, hashes.idempotencyHash, hashes.requestHash, phone, RESERVATION_PRIVACY_VERSION, createdAt],
      );
      return Number(rows[0].reservation_number);
    }

    const orderNumberMine = await insertOrder(PHONE_A, "2026-10-08T09:00:00+00");
    await insertOrder(PHONE_B, "2026-10-08T11:00:00+00");
    const reservationNumberMine = await insertReservation(PHONE_A, "2026-10-08T10:00:00+00");

    const store = createPostgresGuestStore(pool);
    const orders = await store.listOrdersByPhone(PHONE_A);
    const reservations = await store.listReservationsByPhone(PHONE_A);

    expect(orders).toHaveLength(1);
    expect(orders[0]).toEqual({
      kind: "order",
      number: orderNumberMine,
      fulfilment: "pickup",
      state: "pending_confirmation",
      scheduledFor: "2026-11-10T17:00:00.000Z",
      totalCents: 1500,
      createdAt: "2026-10-08T09:00:00.000Z",
    });

    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toEqual({
      kind: "reservation",
      number: reservationNumberMine,
      status: "pending",
      startsAt: "2026-11-11T18:00:00.000Z",
      endsAt: "2026-11-11T20:00:00.000Z",
      partySize: 2,
      createdAt: "2026-10-08T10:00:00.000Z",
    });

    await expect(store.listOrdersByPhone("+49 172 0000000")).resolves.toEqual([]);
    await expect(store.listReservationsByPhone("+49 172 0000000")).resolves.toEqual([]);

    const merged = mergeGuestAnfragen(orders, reservations);
    expect(merged).toHaveLength(2);
    expect(merged[0].kind).toBe("reservation");
  });
});