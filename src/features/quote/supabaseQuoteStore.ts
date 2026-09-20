import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPPORTED_SETTING_KEYS } from "./service";
import type { ClosureRow, PromoRow, QuoteStore, ServiceWindowRow } from "./store";
import type { CommerceSettings, DeliveryZone } from "./domain";

const PROMO_COLUMNS =
  "id, code_lookup, mode, value_percent, value_cents, minimum_subtotal_cents, starts_at, ends_at, active, redemption_limit, redemption_count";

interface PromoApiRow extends Record<string, unknown> {
  id: string;
  code_lookup: string;
  mode: string;
  value_percent: number | null;
  value_cents: number | null;
  minimum_subtotal_cents: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  redemption_limit: number;
  redemption_count: number;
}

interface WindowApiRow extends Record<string, unknown> {
  id: string;
  fulfilment: string;
  weekday: number | null;
  date_override: string | null;
  opens_at: string;
  closes_at: string;
  capacity_per_slot: number;
  active: boolean;
}

interface ClosureApiRow extends Record<string, unknown> {
  id: string;
  starts_at: string;
  ends_at: string;
  affected_services: string[];
}

export function createSupabaseQuoteStore(db: SupabaseClient): QuoteStore {
  return {
    async getCommerceSettings(): Promise<CommerceSettings | null> {
      const result = await db
        .from("settings")
        .select("key, value")
        .in("key", SUPPORTED_SETTING_KEYS);
      if (result.error) throw result.error;
      const rows: Record<string, number> = {};
      for (const item of (result.data ?? []) as Array<{ key: string; value: unknown }>) {
        if (typeof item.value === "number") rows[item.key] = item.value;
      }
      if (SUPPORTED_SETTING_KEYS.some((key) => typeof rows[key] !== "number")) return null;
      return {
        pickupMinimumCents: rows.pickup_minimum_cents,
        asapLeadMinutes: rows.asap_lead_minutes,
        schedulingHorizonDays: rows.scheduling_horizon_days,
        slotIntervalMinutes: rows.slot_interval_minutes,
        maxLineQuantity: rows.max_line_quantity,
      };
    },

    async getDeliveryZoneByPlz(plz: string): Promise<DeliveryZone | null> {
      const result = await db
        .from("delivery_zones")
        .select("id, name, postal_codes, fee_cents, minimum_cents, free_delivery_cents")
        .eq("active", true)
        .contains("postal_codes", [plz]);
      if (result.error) throw result.error;
      const zone = (result.data ?? [])[0] as
        | {
            name: string;
            postal_codes: string[];
            fee_cents: number;
            minimum_cents: number;
            free_delivery_cents: number;
          }
        | undefined;
      if (!zone) return null;
      return {
        zoneName: zone.name,
        postalCodes: zone.postal_codes,
        feeCents: zone.fee_cents,
        minimumCents: zone.minimum_cents,
        freeDeliveryCents: zone.free_delivery_cents,
      };
    },

    async getPromoByCodeLookup(codeLookup: string): Promise<PromoRow | null> {
      const result = await db
        .from("promo_codes")
        .select(PROMO_COLUMNS)
        .eq("code_lookup", codeLookup)
        .limit(1);
      if (result.error) throw result.error;
      const row = (result.data ?? [])[0] as PromoApiRow | undefined;
      if (!row) return null;
      return {
        id: row.id,
        codeLookup: row.code_lookup,
        mode: row.mode as "percent" | "fixed",
        value: row.mode === "percent" ? row.value_percent! : row.value_cents!,
        minimumSubtotalCents: row.minimum_subtotal_cents,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        active: row.active,
        redemptionLimit: row.redemption_limit,
        redemptionCount: row.redemption_count,
      };
    },

    async listServiceWindows(): Promise<ServiceWindowRow[]> {
      const result = await db
        .from("service_windows")
        .select("id, fulfilment, weekday, date_override, opens_at, closes_at, capacity_per_slot, active")
        .eq("active", true)
        .order("opens_at");
      if (result.error) throw result.error;
      return ((result.data ?? []) as WindowApiRow[]).map((row) => ({
        id: row.id,
        fulfilment: row.fulfilment as "pickup" | "delivery",
        weekday: row.weekday,
        dateOverride: row.date_override,
        opensAt: row.opens_at.slice(0, 5),
        closesAt: row.closes_at.slice(0, 5),
        capacityPerSlot: row.capacity_per_slot,
        active: row.active,
      }));
    },

    async listClosures(): Promise<ClosureRow[]> {
      const result = await db.from("closures").select("id, starts_at, ends_at, affected_services");
      if (result.error) throw result.error;
      return ((result.data ?? []) as ClosureApiRow[]).map((row) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        affectedServices: row.affected_services as Array<"pickup" | "delivery">,
      }));
    },
  };
}
