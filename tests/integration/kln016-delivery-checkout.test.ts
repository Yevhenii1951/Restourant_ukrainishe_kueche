import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { resolveTestDatabaseUrl } from "@/lib/db/fuse";
import { bootstrapRoles, runMigrations, runSeeds } from "@/lib/db/runner";
import { resetTestDatabase } from "@/lib/db/reset";
import { hashQuotePayload, signQuote, type CommerceSettings } from "@/features/quote/domain";
import type { QuoteStore } from "@/features/quote/store";
import type { PublicMenu } from "@/features/menu/domain";
import { createDeliveryOrder, type OrderServiceDeps } from "@/features/order/service";

const NOW = new Date("2026-10-07T08:00:00.000Z");
const SECRET = "kln016-delivery-integration-secret";
const ITEM_ID = "00000000-0000-0000-0000-0000000000a1";
const SLOT = "2026-10-07T10:00:00.000Z";

const settings: CommerceSettings = {
  pickupMinimumCents: 0,
  asapLeadMinutes: 30,
  schedulingHorizonDays: 14,
  slotIntervalMinutes: 15,
  maxLineQuantity: 20,
};

const menu: PublicMenu = {
  items: [{
    id: ITEM_ID, slug: "borschtsch", categoryId: "00000000-0000-0000-0000-0000000000d1",
    categorySlug: "suppen", categoryName: "Suppen", name: "Borschtsch", description: "Demo",
    portionLabel: "Portion", basePriceCents: 1600, glutenFree: false, vegan: false,
    vegetarian: true, spicy: false, popular: true, allergens: [], additives: [],
    image: { storagePath: null, alt: null }, sortOrder: 1, categorySortOrder: 1, modifierGroups: [], searchText: "borschtsch",
  }],
  allergenReference: [], additiveReference: [],
};

const store: QuoteStore = {
  getCommerceSettings: async () => settings,
  getDeliveryZoneByPlz: async (plz) => plz === "34117"
    ? { zoneName: "Kassel", postalCodes: ["34117"], feeCents: 390, minimumCents: 1500, freeDeliveryCents: 3000 }
    : null,
  getPromoByCodeLookup: async () => null,
  listServiceWindows: async () => [{ id: "delivery", fulfilment: "delivery", weekday: 3, dateOverride: null, opensAt: "11:30", closesAt: "21:30", capacityPerSlot: 8, active: true }],
  listClosures: async () => [],
};

function request(plz: string, idempotencyKey: string, paymentMethod = "cash_delivery") {
  const cart = { version: 1 as const, lines: [{ menuItemId: ITEM_ID, quantity: 1, modifierSelections: [] }] };
  const payload = { cart, fulfilment: "delivery" as const, plz, promoCode: null, tipCents: 0, slotStartUtc: SLOT };
  return {
    quoteToken: signQuote({ quoteId: idempotencyKey, expiresAtMs: NOW.getTime() + 60_000, payloadHash: hashQuotePayload(payload) }, SECRET),
    ...payload,
    paymentMethod,
    contact: { guestName: "Anna Mustermann", guestPhone: "+49 170 1234567", privacyVersion: "1", privacyAccepted: true },
    deliveryAddress: { street: "Königsplatz", houseNumber: "1", postalCode: plz, city: "Kassel", deliveryNote: "Bitte klingeln" },
    idempotencyKey,
  };
}

describe("KLN-016 delivery checkout", () => {
  let pool: Pool;
  let deps: OrderServiceDeps;

  beforeAll(async () => {
    const databaseUrl = resolveTestDatabaseUrl(process.env as Record<string, string | undefined>);
    await bootstrapRoles(databaseUrl);
    await resetTestDatabase(databaseUrl);
    await runMigrations(databaseUrl);
    await runSeeds(databaseUrl);
    pool = new Pool({ connectionString: databaseUrl });
    deps = { pool, secret: SECRET, now: NOW, store, loadMenu: async () => menu };
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a cash delivery order with the server fee and private address snapshot", async () => {
    const result = await createDeliveryOrder(request("34117", "11111111-1111-4111-8111-111111111111"), "de", deps);
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.order).toMatchObject({ deliveryFeeCents: 390, subtotalCents: 1600, totalCents: 1990 });

    const row = await pool.query<{ fulfilment: string; payment_method: string; postal_code: string; street: string }>(
      `SELECT o.fulfilment, o.payment_method, a.postal_code, a.street
       FROM orders o JOIN order_delivery_addresses a ON a.order_id = o.id
       WHERE o.order_number = $1`,
      [result.order.orderNumber],
    );
    expect(row.rows[0]).toEqual({ fulfilment: "delivery", payment_method: "cash_delivery", postal_code: "34117", street: "Königsplatz" });
  });

  it("blocks an exact five-digit PLZ absent from active zones without persistence", async () => {
    const before = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM orders");
    const result = await createDeliveryOrder(request("99999", "22222222-2222-4222-8222-222222222222"), "de", deps);
    expect(result).toMatchObject({ status: "rejected", reason: "zone-not-eligible" });
    const after = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM orders");
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("rejects a cash-on-pickup method for delivery and DB-active zone overlaps", async () => {
    const badMethod = await createDeliveryOrder(request("34117", "33333333-3333-4333-8333-333333333333", "cash_pickup"), "de", deps);
    expect(badMethod).toMatchObject({ status: "rejected", reason: "input" });
    await expect(pool.query(
      `INSERT INTO delivery_zones (name, postal_codes, fee_cents, minimum_cents, free_delivery_cents, active)
       VALUES ('Overlap', ARRAY['34117'], 100, 100, 100, true)`,
    )).rejects.toThrow(/active delivery zones must not share/i);
  });
});
