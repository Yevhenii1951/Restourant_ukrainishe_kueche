import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import Stripe from "stripe";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { constructStripeWebhookEvent, processStripeWebhookEvent } from "@/features/payments/webhook";

const SECRET = "whsec_kln017_test_secret";
const SLOT = "2026-10-07T10:00:00.000Z";
const ITEMS = JSON.stringify([
  { name: "Borschtsch klassisch", basePriceCents: 1600, lineTotalCents: 1600, quantity: 1, allergens: [], modifiers: [] },
]);

function signedCheckoutEvent(sessionId: string, amountCents: number, eventId = `evt_${randomUUID()}`) {
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
        metadata: { source: "kln017" },
      },
    },
  });
  return {
    payload,
    signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }),
  };
}

function signedRefundEvent(refundId: string, amountCents: number, eventId = "evt_" + randomUUID()) {
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    type: "refund.updated",
    data: { object: { id: refundId, object: "refund", amount: amountCents, currency: "eur", status: "succeeded" } },
  });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

describe("KLN-017 Stripe webhook payment truth", () => {
  let pool: Pool;

  beforeAll(async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function insertBoundOrder(amountCents = 1990): Promise<{ orderId: string; sessionId: string }> {
    const inserted = await pool.query<{ insert_stripe_checkout_order: string }>(
      `SELECT insert_stripe_checkout_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        `token-${randomUUID()}`,
        `idem-${randomUUID()}`,
        `req-${randomUUID()}`,
        "pickup",
        SLOT,
        "Anna Mustermann",
        "+49 170 1234567",
        "1",
        1600,
        null,
        0,
        0,
        amountCents - 1600,
        amountCents,
        ITEMS,
        null,
        null,
        null,
        null,
        null,
      ],
    );
    const orderId = inserted.rows[0].insert_stripe_checkout_order;
    const sessionId = `cs_test_${randomUUID()}`;
    await pool.query("SELECT bind_stripe_checkout_payment($1,$2,$3,$4,$5)", [
      orderId,
      sessionId,
      `https://checkout.stripe.test/${sessionId}`,
      amountCents,
      "EUR",
    ]);
    return { orderId, sessionId };
  }

  it("processes one signed paid event once when Stripe retries it", async () => {
    const { orderId, sessionId } = await insertBoundOrder();
    const signed = signedCheckoutEvent(sessionId, 1990, "evt_kln017_paid_once");
    const event = constructStripeWebhookEvent(signed.payload, signed.signature, SECRET);

    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("paid");
    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("duplicate");

    const payment = await pool.query<{ state: string }>("SELECT state FROM payments WHERE order_id = $1", [orderId]);
    const order = await pool.query<{ state: string }>("SELECT state FROM orders WHERE id = $1", [orderId]);
    const statusEvents = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM order_status_events WHERE order_id = $1 AND reason = 'stripe_paid'",
      [orderId],
    );
    const providerEvents = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM payment_events WHERE provider_event_id = 'evt_kln017_paid_once'",
    );
    expect(payment.rows[0].state).toBe("paid");
    expect(order.rows[0].state).toBe("pending_confirmation");
    expect(statusEvents.rows[0].n).toBe(1);
    expect(providerEvents.rows[0].n).toBe(1);
  });

  it("starts one full refund and finalizes one replayed provider webhook", async () => {
    const { orderId, sessionId } = await insertBoundOrder();
    const paid = signedCheckoutEvent(sessionId, 1990, "evt_kln018_paid");
    await processStripeWebhookEvent(constructStripeWebhookEvent(paid.payload, paid.signature, SECRET), pool);
    const createdStaff = await pool.query<{ id: string }>(
      "SELECT id FROM bootstrap_staff_admin($1::uuid,$2,$3)",
      [randomUUID(), "Refund Admin", "corr-kln018-admin"],
    );
    const actorId = createdStaff.rows[0].id;

    const first = await pool.query<{ prepare_stripe_full_refund: { refundId: string; amountCents: number } }>(
      "SELECT prepare_stripe_full_refund($1,$2,$3,$4)", [orderId, "Gast hat storniert", actorId, "corr-kln018-1"],
    );
    const second = await pool.query<{ prepare_stripe_full_refund: { refundId: string; amountCents: number } }>(
      "SELECT prepare_stripe_full_refund($1,$2,$3,$4)", [orderId, "Gast hat storniert", actorId, "corr-kln018-2"],
    );
    expect(second.rows[0].prepare_stripe_full_refund.refundId).toBe(first.rows[0].prepare_stripe_full_refund.refundId);
    expect(first.rows[0].prepare_stripe_full_refund.amountCents).toBe(1990);

    const refundId = first.rows[0].prepare_stripe_full_refund.refundId;
    await pool.query("SELECT record_stripe_refund_provider_result($1,$2,$3,$4)", [refundId, "re_kln018_failed", false, "provider_error"]);
    const retry = await pool.query<{ prepare_stripe_full_refund: { refundId: string } }>(
      "SELECT prepare_stripe_full_refund($1,$2,$3,$4)", [orderId, "Gast hat storniert", actorId, "corr-kln018-retry"],
    );
    expect(retry.rows[0].prepare_stripe_full_refund.refundId).toBe(refundId);
    const failedAudit = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM audit_events WHERE action = 'payment.refund.failed' AND entity_id = $1", [refundId],
    );
    expect(failedAudit.rows[0].n).toBe(1);

    await pool.query("SELECT record_stripe_refund_provider_result($1,$2,$3)", [refundId, "re_kln018_once", true]);
    const signed = signedRefundEvent("re_kln018_once", 1990, "evt_kln018_refunded");
    const event = constructStripeWebhookEvent(signed.payload, signed.signature, SECRET);
    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("refunded");
    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("duplicate");

    const states = await pool.query<{ payment_state: string; refund_state: string; amount_cents: number }>(
      "SELECT p.state AS payment_state, r.state AS refund_state, r.amount_cents FROM refunds r JOIN payments p ON p.id = r.payment_id WHERE r.id = $1",
      [refundId],
    );
    expect(states.rows[0]).toEqual({ payment_state: "refunded", refund_state: "succeeded", amount_cents: 1990 });
  });

  it("fails safely for amount mismatch and invalid signatures", async () => {
    const { orderId, sessionId } = await insertBoundOrder();
    const signed = signedCheckoutEvent(sessionId, 2090, "evt_kln017_mismatch");
    const event = constructStripeWebhookEvent(signed.payload, signed.signature, SECRET);

    await expect(processStripeWebhookEvent(event, pool)).resolves.toBe("mismatch");
    const rows = await pool.query<{ payment_state: string; order_state: string; result: string }>(
      `SELECT p.state AS payment_state, o.state AS order_state, e.result
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN payment_events e ON e.provider_event_id = 'evt_kln017_mismatch'
       WHERE p.order_id = $1`,
      [orderId],
    );
    expect(rows.rows[0]).toEqual({ payment_state: "checkout_created", order_state: "awaiting_payment", result: "amount-currency-mismatch" });
    expect(() => constructStripeWebhookEvent(signed.payload, "bad-signature", SECRET)).toThrow();
  });
});
