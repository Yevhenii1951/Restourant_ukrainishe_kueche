import type { DatabaseRunner } from "@/features/quote/slotsService";
import { emailMessage, emailOutboxRowSchema, type EmailAdapter } from "./domain";
export async function deliverEmailOutbox(pool: DatabaseRunner, adapter: EmailAdapter, baseUrl: string): Promise<number> {
  const claimed = await pool.query("SELECT * FROM claim_email_outbox($1)", [10]); let delivered = 0;
  for (const raw of claimed.rows) { const parsed = emailOutboxRowSchema.safeParse(raw); if (!parsed.success) continue;
    try { const result = await adapter.send(emailMessage(parsed.data, baseUrl), parsed.data.id); await pool.query("SELECT complete_email_outbox($1,$2,$3)", [parsed.data.id, result.providerMessageId, true]); delivered += 1; }
    catch { await pool.query("SELECT complete_email_outbox($1,$2,$3)", [parsed.data.id, null, false]); } }
  return delivered;
}
