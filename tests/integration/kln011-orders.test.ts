import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { hashQuotePayload, signQuote } from "@/features/quote/domain";
import type { CommerceSettings } from "@/features/quote/domain";
import type { PublicMenu, PublicMenuItem } from "@/features/menu/domain";
import type { QuoteStore } from "@/features/quote/store";
import { derivePublicOrderToken, sha256Hex, type CreateOrderInput } from "@/features/order/domain";
import { cancelPublicOrder, createPickupOrder, getPublicOrder, type OrderServiceDeps } from "@/features/order/service";
import { getSlotsFromStore } from "@/features/quote/slotsService";

const NOW = new Date("2026-10-07T08:00:00.000Z");
const ITEM_ID = "00000000-0000-0000-0000-0000000000a1";
const SECRET = "integration-test-secret-for-pickup-order-tokens";
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

const MENU_FIXTURE: PublicMenu = {
  items: [ITEM],
  allergenReference: [{ code: "G", label: "Gluten" }],
  additiveReference: [],
};

const SETTINGS: CommerceSettings = {
  pickupMinimumCents: 0,
  asapLeadMinutes: 30,
  schedulingHorizonDays: 14,
  slotIntervalMinutes: 15,
  maxLineQuantity: 20,
};

let windowCapacity = 8;

const fakeStore: QuoteStore = {
  getCommerceSettings: async () => SETTINGS,
  getDeliveryZoneByPlz: async () => null,
  getPromoByCodeLookup: async () => null,
  listServiceWindows: async () => [
    {
      id: "00000000-0000-0000-0000-0000000000e1",
      weekday: 3,
      dateOverride: null,
      opensAt: "11:30",
      closesAt: "22:00",
      capacityPerSlot: windowCapacity,
      active: true,
    },
  ],
  listClosures: async () => [],
};

async function withRole<T>(
  databaseUrl: string,
  role: string,
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`SET ROLE ${role}`);
    return await run(client);
  } finally {
    await client.end();
  }
}

describe("KLN-011 guest pickup order with cash on pickup", () => {
  let pool: Pool;
  let deps: OrderServiceDeps;
  const cart = {
    version: 1 as const,
    lines: [{ menuItemId: ITEM_ID, quantity: 2, modifierSelections: [] }],
  };

  beforeAll(async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    deps = {
      pool,
      secret: SECRET,
      now: NOW,
      store: fakeStore,
      loadMenu: async () => MENU_FIXTURE,
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  async function firstSlot(): Promise<string> {
    const slots = await getSlotsFromStore({ fulfilment: "pickup", date: "2026-10-07" }, NOW, { store: fakeStore, pool });
    expect(slots.status).toBe("slots");
    if (slots.status !== "slots") throw new Error("no slots");
    return slots.slots[0].startUtc;
  }

  function signedToken(slotStartUtc: string, overrides?: Partial<typeof cart>): string {
    const payload = {
      cart: { ...cart, ...overrides },
      fulfilment: "pickup" as const,
      plz: null,
      promoCode: null,
      tipCents: 0,
      slotStartUtc,
    };
    return signQuote({ quoteId: randomUUID(), expiresAtMs: NOW.getTime() + 5 * 60_000, payloadHash: hashQuotePayload(payload) }, SECRET);
  }

  function request(slotStartUtc: string, idempotencyKey: string, extra?: Record<string, unknown>): CreateOrderInput {
    const token = (extra?.quoteToken as string) ?? signedToken(slotStartUtc);
    return {
      quoteToken: token,
      cart,
      fulfilment: "pickup",
      plz: null,
      promoCode: null,
      tipCents: 0,
      slotStartUtc,
      paymentMethod: "cash_pickup",
      contact: {
        guestName: "Oleg Petrenko",
        guestPhone: "0151 12345678",
        privacyVersion: "1",
        privacyAccepted: true,
      },
      idempotencyKey,
      ...extra,
    } as CreateOrderInput;
  }

  it("creates a pending_confirmation order with snapshots and a masked projection", async () => {
    const slot = await firstSlot();
    const result = await createPickupOrder(request(slot, randomUUID()), LOCALE, deps);
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.replayed).toBe(false);
    expect(result.token.length).toBeGreaterThan(40);
    expect(result.order.state).toBe("pending_confirmation");
    expect(result.order.totalCents).toBe(1580);
    expect(result.order.subtotalCents).toBe(1580);
    expect(result.order.discountCents).toBe(0);
    expect(result.order.deliveryFeeCents).toBe(0);
    expect(result.order.tipCents).toBe(0);
    expect(result.order.scheduledFor).toBe(slot);
    expect(result.order.lines).toEqual([
      { name: "Borschtsch klassisch", quantity: 2, lineTotalCents: 1580, modifiers: [] },
    ]);

    const stored = await pool.query<{ guest_name: string; guest_phone: string; allergen: unknown; idempotency: string }>(
      `SELECT o.guest_name, o.guest_phone, oi.allergen_snapshot AS allergen, o.idempotency_hash AS idempotency
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.public_token_hash = $1`,
      [sha256Hex(result.token)],
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0].guest_name).toBe("Oleg Petrenko");
    expect(stored.rows[0].guest_phone).toBe("0151 12345678");
    expect(stored.rows[0].allergen).toEqual(["G"]);
    expect(stored.rows[0].idempotency).toMatch(/^[a-f0-9]{64}$/);
  });

  it("replays the same idempotency key with the identical result and token", async () => {
    const slot = await firstSlot();
    const key = randomUUID();
    const first = await createPickupOrder(request(slot, key), LOCALE, deps);
    expect(first.status).toBe("created");
    if (first.status !== "created") return;
    const second = await createPickupOrder(request(slot, key), LOCALE, deps);
    expect(second).toEqual({ status: "created", order: first.order, token: first.token, replayed: true });
  });

  it("returns conflict for the same idempotency key with a different payload", async () => {
    const slot = await firstSlot();
    const key = randomUUID();
    const first = await createPickupOrder(request(slot, key), LOCALE, deps);
    expect(first.status).toBe("created");
    if (first.status !== "created") return;
    const conflicting = await createPickupOrder(
      request(slot, key, {
        contact: {
          guestName: "Ihor",
          guestPhone: "0151 12345678",
          privacyVersion: "1",
          privacyAccepted: true,
        },
      }),
      LOCALE,
      deps,
    );
    expect(conflicting.status).toBe("conflict");
    const count = await pool.query<{ n: string }>("SELECT count(*) AS n FROM orders WHERE idempotency_hash = $1", [sha256Hex(key)]);
    expect(Number(count.rows[0].n)).toBe(1);
  });

  it("rejects a stale quote whose payload no longer matches the request", async () => {
    const slot = await firstSlot();
    const staleToken = signedToken(slot, { lines: [{ menuItemId: ITEM_ID, quantity: 3, modifierSelections: [] }] });
    const result = await createPickupOrder(request(slot, randomUUID(), { quoteToken: staleToken }), LOCALE, deps);
    expect(result).toEqual({ status: "rejected", reason: "quote-stale" });
  });

  it("rejects an expired quote token", async () => {
    const slot = await firstSlot();
    const payload = { cart, fulfilment: "pickup", plz: null, promoCode: null, tipCents: 0, slotStartUtc: slot };
    const expired = signQuote({ quoteId: randomUUID(), expiresAtMs: NOW.getTime() - 1, payloadHash: hashQuotePayload(payload) }, SECRET);
    const result = await createPickupOrder(request(slot, randomUUID(), { quoteToken: expired }), LOCALE, deps);
    expect(result).toEqual({ status: "rejected", reason: "quote-invalid" });
  });

  it("rejects a tampered token and a token signed with a different secret", async () => {
    const slot = await firstSlot();
    const valid = signedToken(slot);
    const tampered = valid.slice(0, -1) + (valid.endsWith("a") ? "b" : "a");
    const result = await createPickupOrder(request(slot, randomUUID(), { quoteToken: tampered }), LOCALE, deps);
    expect(result).toEqual({ status: "rejected", reason: "quote-invalid" });

    const otherSecret = "another-secret-that-does-not-match-this-test";
    const foreign = signQuote({ quoteId: randomUUID(), expiresAtMs: NOW.getTime() + 5 * 60_000, payloadHash: hashQuotePayload({ cart, fulfilment: "pickup", plz: null, promoCode: null, tipCents: 0, slotStartUtc: slot }) }, otherSecret);
    const foreignResult = await createPickupOrder(request(slot, randomUUID(), { quoteToken: foreign }), LOCALE, deps);
    expect(foreignResult).toEqual({ status: "rejected", reason: "quote-invalid" });
  });

  it("rejects an order when privacy consent is not accepted", async () => {
    const slot = await firstSlot();
    const result = await createPickupOrder(
      request(slot, randomUUID(), { contact: { guestName: "Oleg", guestPhone: "0151 1", privacyVersion: "1", privacyAccepted: false } }),
      LOCALE,
      deps,
    );
    expect(result).toEqual({ status: "rejected", reason: "privacy-not-accepted" });
  });

  it("rejects a slot that is not offered", async () => {
    const offSlot = "2026-10-07T04:30:00.000Z";
    const result = await createPickupOrder(request(offSlot, randomUUID(), { quoteToken: signedToken(offSlot) }), LOCALE, deps);
    expect(result).toEqual({ status: "rejected", reason: "slot-unavailable" });
  });

  it("enforces slot capacity and frees it on cancellation", async () => {
    windowCapacity = 1;
    await pool.query("UPDATE service_windows SET capacity_per_slot = 1 WHERE fulfilment = 'pickup'");
    try {
      const slots = await getSlotsFromStore({ fulfilment: "pickup", date: "2026-10-07" }, NOW, { store: fakeStore, pool });
      if (slots.status !== "slots") throw new Error("no slots");
      const free = slots.slots.find((slot) => slot.remainingCapacity > 0);
      if (!free) throw new Error("no free slot");
      const chosen = free.startUtc;

      const first = await createPickupOrder(request(chosen, randomUUID(), { quoteToken: signedToken(chosen) }), LOCALE, deps);
      expect(first.status).toBe("created");
      if (first.status !== "created") return;

      const full = await createPickupOrder(request(chosen, randomUUID(), { quoteToken: signedToken(chosen) }), LOCALE, deps);
      expect(full.status).toBe("rejected");
      if (full.status === "rejected") expect(full.reason).toBe("slot-unavailable");

      const cancelled = await cancelPublicOrder(first.token, "changed my mind", deps);
      expect(cancelled.status).toBe("cancelled");
      if (cancelled.status === "cancelled") {
        expect(cancelled.order.state).toBe("cancelled");
        expect(cancelled.order.orderNumber).toBe(first.order.orderNumber);
      }

      const after = await getPublicOrder(first.token, deps);
      expect(after.status).toBe("order");
      if (after.status === "order") expect(after.order.state).toBe("cancelled");

      const reserved = await createPickupOrder(request(chosen, randomUUID(), { quoteToken: signedToken(chosen) }), LOCALE, deps);
      expect(reserved.status).toBe("created");

      const neutral = await cancelPublicOrder("not-a-real-token", "x", deps);
      expect(neutral.status).toBe("neutral");
    } finally {
      windowCapacity = 8;
      await pool.query("UPDATE service_windows SET capacity_per_slot = 8 WHERE fulfilment = 'pickup'");
    }
  });

  it("uses the deterministic public token for the public order link", async () => {
    const slot = await firstSlot();
    const key = randomUUID();
    const created = await createPickupOrder(request(slot, key), LOCALE, deps);
    expect(created.status).toBe("created");
    if (created.status !== "created") return;
    expect(created.token).toBe(derivePublicOrderToken(SECRET, key));
    const lookedUp = await getPublicOrder(created.token, deps);
    expect(lookedUp.status).toBe("order");
    if (lookedUp.status === "order") expect(lookedUp.order.orderNumber).toBe(created.order.orderNumber);
    const unknown = await getPublicOrder("totally-unknown-token", deps);
    expect(unknown.status).toBe("not-found");
  });

  it("denies anon direct access to order tables and guards illegal transitions", async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await expect(withRole(databaseUrl, "anon", (client) => client.query("SELECT * FROM orders LIMIT 1"))).rejects.toThrow();

    const slot = await firstSlot();
    const created = await createPickupOrder(request(slot, randomUUID()), LOCALE, deps);
    expect(created.status).toBe("created");
    if (created.status !== "created") return;
    // pending_confirmation -> accepted is legal since KLN-012 staff queue;
    // completed is not reachable from the guest state and stays guarded.
    const illegal = pool.query("UPDATE orders SET state = 'completed' WHERE id = (SELECT id FROM orders WHERE order_number = $1)", [created.order.orderNumber]);
    await expect(illegal).rejects.toThrow(/invalid order state transition/);

    const events = await pool.query<{ to_state: string }>("SELECT to_state FROM order_status_events ORDER BY created_at");
    expect(events.rows.at(-1)?.to_state).toBe("pending_confirmation");
  });
});