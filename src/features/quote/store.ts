import type { CommerceSettings, DeliveryZone } from "./domain";

export interface PromoRow {
  id: string;
  codeLookup: string;
  mode: "percent" | "fixed";
  value: number;
  minimumSubtotalCents: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  redemptionLimit: number;
  redemptionCount: number;
}

export interface ServiceWindowRow {
  id: string;
  weekday: number | null;
  dateOverride: string | null;
  opensAt: string;
  closesAt: string;
  capacityPerSlot: number;
  active: boolean;
}

export interface ClosureRow {
  id: string;
  startsAt: string;
  endsAt: string;
  affectedServices: Array<"pickup" | "delivery">;
}

export interface QuoteStore {
  getCommerceSettings(): Promise<CommerceSettings | null>;
  getDeliveryZoneByPlz(plz: string): Promise<DeliveryZone | null>;
  getPromoByCodeLookup(codeLookup: string): Promise<PromoRow | null>;
  listServiceWindows(): Promise<ServiceWindowRow[]>;
  listClosures(): Promise<ClosureRow[]>;
}

export function promoWindowOpen(row: PromoRow, nowMs: number): boolean {
  if (!row.active) return false;
  const starts = row.startsAt ? Date.parse(row.startsAt) : Number.NEGATIVE_INFINITY;
  const ends = row.endsAt ? Date.parse(row.endsAt) : Number.POSITIVE_INFINITY;
  if (nowMs < starts || nowMs > ends) return false;
  return row.redemptionLimit === 0 || row.redemptionCount < row.redemptionLimit;
}