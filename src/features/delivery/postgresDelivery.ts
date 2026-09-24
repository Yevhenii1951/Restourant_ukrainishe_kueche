import "server-only";
import type { Pool } from "pg";
import { insertAuditEvent } from "@/lib/db/audit";

export type DeliveryZoneCreateInput = {
  name: string;
  postalCodes: string[];
  feeCents: number;
  minimumCents: number;
  freeDeliveryCents: number;
};

export type DeliveryZoneRow = {
  id: string;
  name: string;
  postalCodes: string[];
  feeCents: number;
  minimumCents: number;
  freeDeliveryCents: number;
};

export type DeliveryWindowCreateInput = {
  weekday: number;
  opensAt: string;
  closesAt: string;
  capacity: number;
};

export type DeliveryWindowRow = {
  id: string;
  weekday: number;
  opensAt: string;
  closesAt: string;
  capacityPerSlot: number;
};

export async function listDeliveryZones(pool: Pool): Promise<DeliveryZoneRow[]> {
  const result = await pool.query<{
    id: string;
    name: string;
    postal_codes: string[];
    fee_cents: number;
    minimum_cents: number;
    free_delivery_cents: number;
  }>(
    "SELECT id, name, postal_codes, fee_cents, minimum_cents, free_delivery_cents FROM delivery_zones ORDER BY name",
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    postalCodes: row.postal_codes,
    feeCents: row.fee_cents,
    minimumCents: row.minimum_cents,
    freeDeliveryCents: row.free_delivery_cents,
  }));
}

export async function listDeliveryWindows(pool: Pool): Promise<DeliveryWindowRow[]> {
  const result = await pool.query<{
    id: string;
    weekday: number;
    opens_at: string;
    closes_at: string;
    capacity_per_slot: number;
  }>(
    "SELECT id, weekday, opens_at::text, closes_at::text, capacity_per_slot FROM service_windows WHERE fulfilment = 'delivery' ORDER BY weekday, opens_at",
  );
  return result.rows.map((row) => ({
    id: row.id,
    weekday: row.weekday,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    capacityPerSlot: row.capacity_per_slot,
  }));
}

export async function createDeliveryZone(
  pool: Pool,
  input: DeliveryZoneCreateInput,
  audit: { actorId: string; correlationId: string },
): Promise<{ id: string }> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO delivery_zones
       (name, postal_codes, fee_cents, minimum_cents, free_delivery_cents, active)
     VALUES ($1, $2::text[], $3, $4, $5, true)
     RETURNING id`,
    [input.name, input.postalCodes, input.feeCents, input.minimumCents, input.freeDeliveryCents],
  );
  const id = result.rows[0].id;
  await insertAuditEvent(pool, {
    actorId: audit.actorId,
    action: "delivery.zone.create",
    entityType: "delivery_zone",
    entityId: id,
    afterData: { ...input },
    correlationId: audit.correlationId,
  });
  return { id };
}

export async function createDeliveryWindow(
  pool: Pool,
  input: DeliveryWindowCreateInput,
  audit: { actorId: string; correlationId: string },
): Promise<{ id: string }> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO service_windows
       (fulfilment, weekday, opens_at, closes_at, capacity_per_slot, active)
     VALUES ('delivery', $1, $2::time, $3::time, $4, true)
     RETURNING id`,
    [input.weekday, input.opensAt, input.closesAt, input.capacity],
  );
  const id = result.rows[0].id;
  await insertAuditEvent(pool, {
    actorId: audit.actorId,
    action: "delivery.window.create",
    entityType: "service_window",
    entityId: id,
    afterData: { ...input },
    correlationId: audit.correlationId,
  });
  return { id };
}