import "server-only";
import type { Pool } from "pg";
import { SUPPORTED_SETTING_KEYS } from "./service";
import type { CommerceSettings, DeliveryZone } from "./domain";
import type { ClosureRow, PromoRow, QuoteStore, ServiceWindowRow } from "./store";

type SettingRow = { key: string; value: unknown };
type ZoneRow = { name: string; postal_codes: string[]; fee_cents: number; minimum_cents: number; free_delivery_cents: number };
type PromoDbRow = { id: string; code_lookup: string; mode: "percent" | "fixed"; value_percent: number | null; value_cents: number | null; minimum_subtotal_cents: number; starts_at: Date | null; ends_at: Date | null; active: boolean; redemption_limit: number; redemption_count: number };
type WindowRow = { id: string; fulfilment: "pickup" | "delivery"; weekday: number | null; date_override: string | null; opens_at: string; closes_at: string; capacity_per_slot: number; active: boolean };
type ClosureDbRow = { id: string; starts_at: Date; ends_at: Date; affected_services: Array<"pickup" | "delivery"> };

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function createPostgresQuoteStore(db: Pool): QuoteStore {
  return {
    async getCommerceSettings(): Promise<CommerceSettings | null> {
      const result = await db.query<SettingRow>("SELECT key, value FROM settings WHERE key = ANY($1)", [SUPPORTED_SETTING_KEYS]);
      const values = Object.fromEntries(result.rows.filter((row) => typeof row.value === "number").map((row) => [row.key, row.value])) as Record<string, number>;
      if (SUPPORTED_SETTING_KEYS.some((key) => typeof values[key] !== "number")) return null;
      return { pickupMinimumCents: values.pickup_minimum_cents, asapLeadMinutes: values.asap_lead_minutes, schedulingHorizonDays: values.scheduling_horizon_days, slotIntervalMinutes: values.slot_interval_minutes, maxLineQuantity: values.max_line_quantity };
    },
    async getDeliveryZoneByPlz(plz: string): Promise<DeliveryZone | null> {
      const result = await db.query<ZoneRow>("SELECT name, postal_codes, fee_cents, minimum_cents, free_delivery_cents FROM delivery_zones WHERE active AND $1 = ANY(postal_codes) LIMIT 1", [plz]);
      const row = result.rows[0];
      return row ? { zoneName: row.name, postalCodes: row.postal_codes, feeCents: row.fee_cents, minimumCents: row.minimum_cents, freeDeliveryCents: row.free_delivery_cents } : null;
    },
    async getPromoByCodeLookup(codeLookup: string): Promise<PromoRow | null> {
      const result = await db.query<PromoDbRow>("SELECT id, code_lookup, mode, value_percent, value_cents, minimum_subtotal_cents, starts_at, ends_at, active, redemption_limit, redemption_count FROM promo_codes WHERE code_lookup = $1 LIMIT 1", [codeLookup]);
      const row = result.rows[0];
      if (!row) return null;
      return { id: row.id, codeLookup: row.code_lookup, mode: row.mode, value: row.mode === "percent" ? row.value_percent ?? 0 : row.value_cents ?? 0, minimumSubtotalCents: row.minimum_subtotal_cents, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), active: row.active, redemptionLimit: row.redemption_limit, redemptionCount: row.redemption_count };
    },
    async listServiceWindows(): Promise<ServiceWindowRow[]> {
      const result = await db.query<WindowRow>("SELECT id, fulfilment, weekday, date_override::text, opens_at::text, closes_at::text, capacity_per_slot, active FROM service_windows WHERE active ORDER BY opens_at");
      return result.rows.map((row) => ({ id: row.id, fulfilment: row.fulfilment, weekday: row.weekday, dateOverride: row.date_override, opensAt: row.opens_at.slice(0, 5), closesAt: row.closes_at.slice(0, 5), capacityPerSlot: row.capacity_per_slot, active: row.active }));
    },
    async listClosures(): Promise<ClosureRow[]> {
      const result = await db.query<ClosureDbRow>("SELECT id, starts_at, ends_at, affected_services::text[] AS affected_services FROM closures");
      return result.rows.map((row) => ({ id: row.id, startsAt: iso(row.starts_at)!, endsAt: iso(row.ends_at)!, affectedServices: row.affected_services }));
    },
  };
}
