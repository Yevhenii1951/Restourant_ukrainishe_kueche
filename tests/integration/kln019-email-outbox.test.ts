import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { deliverEmailOutbox } from "@/features/notifications/service";
import type { EmailAdapter, EmailMessage } from "@/features/notifications/domain";

class FailOnceAdapter implements EmailAdapter {
  calls = 0;
  messages: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<{ providerMessageId: string }> {
    this.calls += 1;
    if (this.calls === 1) throw new Error("temporary provider failure");
    this.messages.push(message);
    return { providerMessageId: "brevo-message-1" };
  }
}

describe("KLN-019 transactional email outbox", () => {
  let pool: Pool;
  beforeAll(async () => {
    const url = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(url); await resetTestDatabase(url); await runMigrations(url); await runSeeds(url);
    pool = new Pool({ connectionString: url });
  });
  afterAll(async () => { await pool.end(); });

  it("keeps a committed record valid, retries once, and delivers one logical message", async () => {
    await pool.query("SELECT enqueue_email($1,$2,$3,$4,$5::jsonb)", [
      "reservation:demo:requested", "guest@example.test", "de", "reservation_requested", JSON.stringify({ token: "safe-token" }),
    ]);
    const adapter = new FailOnceAdapter();
    await expect(deliverEmailOutbox(pool, adapter, "https://kalyna-demo.example")).resolves.toBe(0);
    const failed = await pool.query<{ state: string; attempts: number }>("SELECT state, attempts FROM email_outbox");
    expect(failed.rows[0]).toEqual({ state: "pending", attempts: 1 });
    await pool.query("UPDATE email_outbox SET next_attempt_at = now()");
    await expect(deliverEmailOutbox(pool, adapter, "https://kalyna-demo.example")).resolves.toBe(1);
    const delivered = await pool.query<{ state: string; attempts: number; provider_message_id: string }>("SELECT state, attempts, provider_message_id FROM email_outbox");
    expect(delivered.rows[0]).toEqual({ state: "delivered", attempts: 2, provider_message_id: "brevo-message-1" });
    expect(adapter.messages).toHaveLength(1);
    expect(adapter.messages[0].text).toContain("/de/reservierung/safe-token");
    expect(adapter.messages[0].text).not.toContain("utm_");
  });
});
