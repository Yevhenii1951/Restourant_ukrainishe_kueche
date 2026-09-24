import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { listClosures } from "@/features/admin/postgresClosures";
import { createPostgresContentStore } from "@/features/content/postgresContentStore";
import { createPostgresQuoteStore } from "@/features/quote/postgresQuoteStore";
import { createPostgresReservationStore } from "@/features/reservation/postgresReservationStore";

vi.mock("server-only", () => ({}));

describe("KLN-034 pool type marshalling", () => {
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

  it("returns closure affectedServices as a JS string array from every pool store", async () => {
    const startsAt = "2031-06-01T10:00:00.000Z";
    const endsAt = "2031-06-01T22:00:00.000Z";
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO closures (starts_at, ends_at, reason, affected_services)
       VALUES ($1, $2, 'Smoke', $3::commercial_service_type[])
       RETURNING id`,
      [startsAt, endsAt, ["reservation", "pickup"]],
    );
    const closureId = inserted.rows[0].id;

    const adminClosures = await listClosures(pool);
    const adminRow = adminClosures.find((row) => row.id === closureId);
    expect(adminRow).toBeDefined();
    expect(Array.isArray(adminRow?.affectedServices)).toBe(true);
    expect(adminRow?.affectedServices).toContain("reservation");

    const reservationClosures = await createPostgresReservationStore(pool).listReservationClosures();
    const reservationRow = reservationClosures.find((row) => row.startsAt === startsAt);
    expect(Array.isArray(reservationRow?.affectedServices)).toBe(true);
    expect(reservationRow?.affectedServices).toContain("reservation");

    const quoteClosures = await createPostgresQuoteStore(pool).listClosures();
    const quoteRow = quoteClosures.find((row) => row.id === closureId);
    expect(Array.isArray(quoteRow?.affectedServices)).toBe(true);
    expect(quoteRow?.affectedServices).toContain("pickup");

    await pool.query("DELETE FROM closures WHERE id = $1", [closureId]);
  });

  it("returns content entry timestamps as ISO strings from the pool store", async () => {
    const entries = await createPostgresContentStore(pool).listEntries();
    expect(entries.length).toBeGreaterThan(0);

    const seeded = entries.find((entry) => entry.typedKey === "home" && entry.publicationState === "published");
    expect(seeded).toBeDefined();
    expect(typeof seeded?.updatedAt).toBe("string");
    expect(seeded?.publishedAt === null || typeof seeded?.publishedAt === "string").toBe(true);
  });
});