import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { hashQuotePayload, signQuote, type CommerceSettings } from "@/features/quote/domain";
import type { PublicMenu, PublicMenuItem } from "@/features/menu/domain";
import type { QuoteStore } from "@/features/quote/store";
import type { CreateOrderInput } from "@/features/order/domain";
import { createPickupOrder, type OrderServiceDeps } from "@/features/order/service";
import { getSlotsFromStore } from "@/features/quote/slotsService";

const NOW = new Date("2026-10-07T08:00:00.000Z");
const ITEM_ID = "00000000-0000-0000-0000-0000000000a1";
const SECRET = "integration-test-secret-for-pickup-order-tokens";
const ACTOR_ID = "00000000-0000-0000-0000-0000000000f1";
const LOCALE = "de";

const ITEM: PublicMenuItem = {
  id: ITEM_ID,
  slug: "borschtsch",
  categoryId: "00000000-0000-0000-0000-0000000000d1",
  categorySlug: "suppen",
  categoryName: "Suppen",
  name: "Borschtsch klassisch",
  description: "Rote Bete Suppe",
  portionLabel: "Portion",
  basePriceCents: 790,
  glutenFree: false,
  vegan: false,
  vegetarian: true,
  spicy: false,
  popular: true,
  allergens: [{ code: "G", label: "Gluten", containment: "contains" }],
  additives: [],
  image: { storagePath: null, alt: null },
  sortOrder: 1,
  categorySortOrder: 1,
  modifierGroups: [],
  searchText: "borschtsch",
};

const MENU_FIXTURE: PublicMenu = { items: [ITEM], allergenReference: [{ code: "G", label: "Gluten" }], additiveReference: [] };
const SETTINGS: CommerceSettings = {
  pickupMinimumCents: 0,
  asapLeadMinutes: 30,
  schedulingHorizonDays: 14,
  slotIntervalMinutes: 15,
  maxLineQuantity: 20,
};

const fakeStore: QuoteStore = {
  getCommerceSettings: async () => SETTINGS,
  getDeliveryZoneByPlz: async () => null,
  getPromoByCodeLookup: async () => null,
  listServiceWindows: async () => [
    { id: "00000000-0000-0000-0000-0000000000e1", weekday: 3, dateOverride: null, opensAt: "11:30", closesAt: "22:00", capacityPerSlot: 8, active: true },
  ],
  listClosures: async () => [],
};

describe("KLN-012 staff order operations (FR-ORD-11, FR-ADM-6, FR-ADM-7, AC-5)", () => {
  let pool: Pool;
  let deps: OrderServiceDeps;
  const cart = { version: 1 as const, lines: [{ menuItemId: ITEM_ID, quantity: 1, modifierSelections: [] }] };

  beforeAll(async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    deps = { pool, secret: SECRET, now: NOW, store: fakeStore, loadMenu: async () => MENU_FIXTURE };
    await pool.query(
      `INSERT INTO staff_profiles (id, auth_user_id, display_name, role, active)
       VALUES ($1, $2, 'Testmanager', 'MANAGER', true)`,
      [ACTOR_ID, "00000000-0000-0000-0000-0000000000fd"],
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  async function insertFixtureOrder(): Promise<number> {
    const items = JSON.stringify([
      { name: "Borschtsch klassisch", basePriceCents: 790, lineTotalCents: 790, quantity: 1, allergens: [], modifiers: [] },
    ]);
    const inserted = await pool.query<{ insert_pickup_order: string }>(
      `SELECT insert_pickup_order($1, $2, $3, $4, $5, $6, $7, $8, NULL, 0, 0, $9, $10)`,
      [
        `token-${randomUUID()}`,
        `idem-${randomUUID()}`,
        `req-${randomUUID()}`,
        "2026-10-07T10:00:00.000Z",
        "Oleg Petrenko",
        "0151 12345678",
        "1",
        790,
        790,
        items,
      ],
    );
    const orderId = inserted.rows[0].insert_pickup_order;
    const row = await pool.query<{ order_number: string }>("SELECT order_number FROM orders WHERE id = $1", [orderId]);
    return Number(row.rows[0].order_number);
  }

  async function transition(orderNumber: number, expectedVersion: number, toState: string, extra: Record<string, unknown>) {
    return pool.query<{ apply_order_transition: Record<string, unknown> }>(
      `SELECT apply_order_transition((SELECT id FROM orders WHERE order_number = $1), $2, $3::order_state, $4, $5, $6::uuid, $7)`,
      [orderNumber, expectedVersion, toState, extra.reason ?? null, extra.estimateMinutes ?? null, ACTOR_ID, "corr-kln012"],
    );
  }

  async function firstSlot(): Promise<string> {
    const slots = await getSlotsFromStore({ fulfilment: "pickup", date: "2026-10-07" }, NOW, { store: fakeStore, pool });
    if (slots.status !== "slots") throw new Error("no slots");
    const free = slots.slots.find((slot) => slot.remainingCapacity > 0);
    if (!free) throw new Error("no free slot");
    return free.startUtc;
  }

  function request(slotStartUtc: string, idempotencyKey: string): CreateOrderInput {
    const payload = { cart, fulfilment: "pickup", plz: null, promoCode: null, tipCents: 0, slotStartUtc };
    return {
      quoteToken: signQuote({ quoteId: randomUUID(), expiresAtMs: NOW.getTime() + 5 * 60_000, payloadHash: hashQuotePayload(payload) }, SECRET),
      cart,
      fulfilment: "pickup",
      plz: null,
      promoCode: null,
      tipCents: 0,
      slotStartUtc,
      paymentMethod: "cash_pickup",
      contact: { guestName: "Oleg Petrenko", guestPhone: "0151 12345678", privacyVersion: "1", privacyAccepted: true },
      idempotencyKey,
    } as CreateOrderInput;
  }

  it("renders the optimistic versioning verification scenario with both attempts audited", async () => {
    const orderNumber = await insertFixtureOrder();
    const accepting = await transition(orderNumber, 1, "accepted", { estimateMinutes: 45 });
    expect(accepting.rows[0].apply_order_transition.status).toBe("applied");
    expect(accepting.rows[0].apply_order_transition.version).toBe(2);
    expect(accepting.rows[0].apply_order_transition.estimateMinutes).toBe(45);

    const stale = await transition(orderNumber, 1, "cancelled", { reason: "double booking" });
    expect(stale.rows[0].apply_order_transition).toMatchObject({ status: "conflict", version: 2 });

    const afterStale = await pool.query<{ state: string; version: number }>(
      "SELECT state, version FROM orders WHERE order_number = $1",
      [orderNumber],
    );
    expect(afterStale.rows[0]).toEqual({ state: "accepted", version: 2 });

    const audit = await pool.query<{ action: string }>(
      `SELECT action FROM audit_events WHERE entity_type = 'order' AND entity_id = (SELECT id::text FROM orders WHERE order_number = $1) ORDER BY created_at`,
      [orderNumber],
    );
    expect(audit.rows.map((row) => row.action)).toContain("order.transition.apply");
    expect(audit.rows.map((row) => row.action)).toContain("order.transition.conflict");

    const cancelled = await transition(orderNumber, 2, "cancelled", { reason: "kitchen closed" });
    expect(cancelled.rows[0].apply_order_transition.status).toBe("applied");
    expect(cancelled.rows[0].apply_order_transition.version).toBe(3);

    const cleared = await pool.query<{ guest_name: string | null; guest_phone: string | null }>(
      "SELECT guest_name, guest_phone FROM orders WHERE order_number = $1",
      [orderNumber],
    );
    expect(cleared.rows[0].guest_name).toBeNull();
    expect(cleared.rows[0].guest_phone).toBeNull();

    const events = await pool.query<{ from_state: string | null; to_state: string; reason: string | null }>(
      "SELECT from_state, to_state, reason FROM order_status_events WHERE order_id = (SELECT id FROM orders WHERE order_number = $1) ORDER BY created_at",
      [orderNumber],
    );
    expect(events.rows.map((row) => row.to_state)).toEqual([
      "pending_confirmation",
      "accepted",
      "cancelled",
    ]);
    expect(events.rows[1].reason).toBeNull();
    expect(events.rows[2].reason).toBe("kitchen closed");
  });

  it("rejects illegal edges both through the function and the trigger, version untouched", async () => {
    const orderNumber = await insertFixtureOrder();
    const illegal = await transition(orderNumber, 1, "completed", {});
    expect(illegal.rows[0].apply_order_transition).toMatchObject({ status: "invalid", version: 1 });

    const direct = pool.query(
      "UPDATE orders SET state = 'completed' WHERE order_number = $1",
      [orderNumber],
    );
    await expect(direct).rejects.toThrow(/invalid order state transition/);

    const state = await pool.query<{ state: string; version: number }>(
      "SELECT state, version FROM orders WHERE order_number = $1",
      [orderNumber],
    );
    expect(state.rows[0]).toEqual({ state: "pending_confirmation", version: 1 });
  });

  it("refuses estimates outside the ordering window at the column level", async () => {
    const orderNumber = await insertFixtureOrder();
    const estimate = pool.query(
      `SELECT apply_order_transition((SELECT id FROM orders WHERE order_number = $1), 1, 'accepted'::order_state, NULL, 300, $2::uuid, 'corr-estimate')`,
      [orderNumber, ACTOR_ID],
    );
    await expect(estimate).rejects.toThrow();
  });

  it("keeps order_status_events and audit_events append-only", async () => {
    const orderNumber = await insertFixtureOrder();
    await transition(orderNumber, 1, "accepted", { estimateMinutes: 30 });

    const eventUpdate = pool.query(
      `UPDATE order_status_events SET reason = 'tampered'
       WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)`,
      [orderNumber],
    );
    await expect(eventUpdate).rejects.toThrow(/append-only/);

    const eventDelete = pool.query(
      `DELETE FROM order_status_events
       WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)`,
      [orderNumber],
    );
    await expect(eventDelete).rejects.toThrow(/append-only/);

    const auditUpdate = pool.query("UPDATE audit_events SET action = 'tampered'");
    await expect(auditUpdate).rejects.toThrow(/append-only/);
  });

  it("paused pickup intake rejects the whole order; reopening resumes it", async () => {
    const toggled = await pool.query<{ set_pickup_accepting_enabled: Record<string, unknown> }>(
      "SELECT set_pickup_accepting_enabled(false, $1::uuid, 'corr-pause')",
      [ACTOR_ID],
    );
    expect(toggled.rows[0].set_pickup_accepting_enabled).toEqual({ enabled: false, version: 1 });

    const slot = await firstSlot();
    const paused = await createPickupOrder(request(slot, randomUUID()), LOCALE, deps);
    expect(paused.status).toBe("rejected");
    if (paused.status === "rejected") expect(paused.reason).toBe("pickup-paused");

    const reopened = await pool.query<{ set_pickup_accepting_enabled: Record<string, unknown> }>(
      "SELECT set_pickup_accepting_enabled(true, $1::uuid, 'corr-reopen')",
      [ACTOR_ID],
    );
    expect(reopened.rows[0].set_pickup_accepting_enabled.version).toBe(2);

    const created = await createPickupOrder(request(slot, randomUUID()), LOCALE, deps);
    expect(created.status).toBe("created");

    const audits = await pool.query<{ action: string }>(
      "SELECT action FROM audit_events WHERE correlation_id IN ('corr-pause', 'corr-reopen') ORDER BY created_at",
    );
    const actions = audits.rows.map((row) => row.action);
    expect(actions).toEqual(["order.pickup_accepting.toggle", "order.pickup_accepting.toggle"]);
  });

  it("keeps order and settings data invisible to anon", async () => {
    const client = new (await import("pg")).Client({
      connectionString: resolveTestDatabaseUrl(process.env as Record<string, string | undefined>),
    });
    await client.connect();
    try {
      await client.query("SET ROLE anon");
      await expect(client.query("SELECT * FROM orders LIMIT 1")).rejects.toThrow();
      await expect(client.query("SELECT * FROM settings LIMIT 1")).rejects.toThrow();
    } finally {
      await client.end();
    }
  });
});