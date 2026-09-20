import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { createCateringInquiry } from "@/features/catering/service";

const STAFF_ID = "00000000-0000-0000-0000-000000000021";

describe("KLN-021 catering inquiries", () => {
  let pool: Pool;

  beforeAll(async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query(
      `INSERT INTO staff_profiles (id, auth_user_id, display_name, role, active)
       VALUES ($1, $2, 'Catering team', 'STAFF', true)`,
      [STAFF_ID, "00000000-0000-0000-0000-000000000022"],
    );
    await pool.query(
      `INSERT INTO staff_invitations (email, auth_user_id, role, inviter_id, accepted_at)
       VALUES ('catering@example.com', $1, 'STAFF', $2, now())`,
      ["00000000-0000-0000-0000-000000000022", STAFF_ID],
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  function input(idempotencyKey: string): Record<string, unknown> {
    return {
      name: "Anna Mustermann",
      email: "anna@example.com",
      phone: "+49 170 1234567",
      eventDate: "2027-01-20",
      guestCount: 24,
      message: "Vegetarische Optionen fuer eine Familienfeier.",
      privacyAccepted: true,
      privacyVersion: "1",
      locale: "de",
      idempotencyKey,
      website: "",
      sourceKey: "203.0.113.42",
    };
  }

  it("stores and notifies the first request, then returns a safe rate response", async () => {
    const first = await createCateringInquiry(input("00000000-0000-4000-8000-000000000001"), { pool });
    expect(first).toMatchObject({ status: "created", inquiry: { state: "new" } });

    const stored = await pool.query<{ state: string; message: string }>(
      "SELECT state::text, message FROM catering_inquiries",
    );
    expect(stored.rows).toEqual([{ state: "new", message: "Vegetarische Optionen fuer eine Familienfeier." }]);

    const email = await pool.query<{ template_key: string; recipient: string }>(
      "SELECT template_key, recipient FROM email_outbox WHERE template_key = 'catering_inquiry'",
    );
    expect(email.rows).toEqual([{ template_key: "catering_inquiry", recipient: "catering@example.com" }]);

    const second = await createCateringInquiry(input("00000000-0000-4000-8000-000000000002"), { pool });
    expect(second).toEqual({ status: "rate-limited" });
    expect((await pool.query("SELECT id FROM catering_inquiries")).rows).toHaveLength(1);
  });

  it("applies only legal staff transitions and audits every transition attempt", async () => {
    const created = await createCateringInquiry(input("00000000-0000-4000-8000-000000000003"), {
      pool,
      sourceKey: "203.0.113.99",
    });
    if (created.status !== "created") throw new Error("expected a catering inquiry");

    const applied = await pool.query<{ apply_catering_transition: { status: string; version: number } }>(
      "SELECT apply_catering_transition($1::uuid, 1, 'contacted'::catering_state, $2::uuid, 'corr-kln021')",
      [created.inquiry.id, STAFF_ID],
    );
    expect(applied.rows[0].apply_catering_transition).toMatchObject({ status: "applied", version: 2 });

    const invalid = await pool.query<{ apply_catering_transition: { status: string } }>(
      "SELECT apply_catering_transition($1::uuid, 2, 'confirmed'::catering_state, $2::uuid, 'corr-kln021')",
      [created.inquiry.id, STAFF_ID],
    );
    expect(invalid.rows[0].apply_catering_transition).toMatchObject({ status: "invalid" });

    const audit = await pool.query<{ action: string }>(
      "SELECT action FROM audit_events WHERE entity_type = 'catering_inquiry' AND entity_id = $1 ORDER BY created_at",
      [created.inquiry.id],
    );
    expect(audit.rows.map((row) => row.action)).toEqual([
      "catering.transition.apply",
      "catering.transition.invalid",
    ]);
  });
});
