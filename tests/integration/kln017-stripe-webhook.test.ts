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
