import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import Stripe from "stripe";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { constructStripeWebhookEvent, processStripeWebhookEvent } from "@/features/payments/webhook";

const SECRET = "whsec_kln020_test_secret";

function signedVoucherPaidEvent(sessionId: string, amountCents: number, eventId = `evt_${randomUUID()}`) {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        amount_total: amountCents,
        currency: "eur",
        payment_intent: `pi_${randomUUID()}`,
        metadata: { purchaseType: "voucher" },
      },
    },
  });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

describe("KLN-020 voucher purchase and redemption", () => {
  let pool: Pool;

  beforeAll(async () => {
    const url = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(url);
    await resetTestDatabase(url);
    await runMigrations(url);
    await runSeeds(url);
    pool = new Pool({ connectionString: url });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function bindVoucherPurchase(amountCents = 2500): Promise<{ purchaseId: string; sessionId: string }> {
    const product = await pool.query<{ id: string }>(
      "SELECT id FROM voucher_products WHERE denomination_cents = $1 AND active ORDER BY sort_order LIMIT 1",
      [amountCents],
    );
    const intent = await pool.query<{ create_voucher_purchase_intent: { purchaseId: string } }>(
      "SELECT create_voucher_purchase_intent($1,$2,$3)",
      [product.rows[0].id, "guest@example.test", "de"],
    );
    const purchaseId = intent.rows[0].create_voucher_purchase_intent.purchaseId;
    const sessionId = `cs_voucher_${randomUUID()}`;
    await pool.query("SELECT bind_stripe_voucher_payment($1,$2,$3,$4,$5)", [
      purchaseId,
      sessionId,
      `https://checkout.stripe.test/${sessionId}`,
      amountCents,
      "EUR",
    ]);
    return { purchaseId, sessionId };
  }

  it("activates one voucher and queues one localized delivery on a replayed Stripe event", async () => {
    const { purchaseId, sessionId } = await bindVoucherPurchase();
    const signed = signedVoucherPaidEvent(sessionId, 2500, "evt_kln020_voucher_paid");
    const event = constructStripeWebhookEvent(signed.payload, signed.signature, SECRET);

    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("paid");
    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("duplicate");

    const voucher = await pool.query<{ remaining_balance_cents: number; state: string; code_hash: string }>(
      "SELECT remaining_balance_cents, state, code_hash FROM vouchers WHERE purchase_id = $1",
      [purchaseId],
    );
    const emails = await pool.query<{ n: number; template_key: string; locale: string }>(
      "SELECT count(*)::int AS n, max(template_key) AS template_key, max(locale) AS locale FROM email_outbox WHERE logical_key = $1",
      [`voucher:${purchaseId}:paid`],
    );
    expect(voucher.rows[0]).toMatchObject({ remaining_balance_cents: 2500, state: "active" });
    expect(voucher.rows[0].code_hash).toHaveLength(64);
    expect(emails.rows[0]).toEqual({ n: 1, template_key: "voucher_purchased", locale: "de" });
  });

  it("locks balance so simultaneous redemption and replay cannot overdraw", async () => {
    const { purchaseId, sessionId } = await bindVoucherPurchase();
    const signed = signedVoucherPaidEvent(sessionId, 2500, "evt_kln020_concurrent_paid");
    await processStripeWebhookEvent(constructStripeWebhookEvent(signed.payload, signed.signature, SECRET), pool);
    const voucher = await pool.query<{ code_hash: string }>("SELECT code_hash FROM vouchers WHERE purchase_id = $1", [purchaseId]);
    const orderA = randomUUID();
    const orderB = randomUUID();

    const [first, second] = await Promise.all([
      pool.query<{ redeem_voucher: { status: string; redeemedCents: number } }>(
        "SELECT redeem_voucher($1,$2,$3,$4)",
        [voucher.rows[0].code_hash, orderA, 1800, "idem-a"],
      ),
      pool.query<{ redeem_voucher: { status: string; redeemedCents: number } }>(
        "SELECT redeem_voucher($1,$2,$3,$4)",
        [voucher.rows[0].code_hash, orderB, 1800, "idem-b"],
      ),
    ]);
    const replay = await pool.query<{ redeem_voucher: { status: string; redeemedCents: number } }>(
      "SELECT redeem_voucher($1,$2,$3,$4)",
      [voucher.rows[0].code_hash, orderA, 1800, "idem-a"],
    );
    const balance = await pool.query<{ remaining_balance_cents: number; redeemed: number }>(
      "SELECT remaining_balance_cents, (SELECT coalesce(sum(amount_cents),0)::int FROM voucher_redemptions r WHERE r.voucher_id = vouchers.id) AS redeemed FROM vouchers WHERE code_hash = $1",
      [voucher.rows[0].code_hash],
    );

    expect([first.rows[0].redeem_voucher.redeemedCents, second.rows[0].redeem_voucher.redeemedCents].sort((a, b) => a - b)).toEqual([700, 1800]);
    expect(replay.rows[0].redeem_voucher).toMatchObject({ status: "duplicate", redeemedCents: 1800 });
    expect(balance.rows[0]).toEqual({ remaining_balance_cents: 0, redeemed: 2500 });
  });
});
