import "server-only";
import type { Pool } from "pg";
import { insertAuditEvent } from "@/lib/db/audit";

export type ClosureCreateInput = {
  startsAt: string;
  endsAt: string;
  services: string[];
};

export type ClosureRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  affectedServices: string[];
};

export async function listClosures(pool: Pool): Promise<ClosureRow[]> {
  const result = await pool.query<{
    id: string;
    starts_at: Date;
    ends_at: Date;
    affected_services: string[];
  }>("SELECT id, starts_at, ends_at, affected_services::text[] AS affected_services FROM closures ORDER BY starts_at");
  return result.rows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    affectedServices: row.affected_services,
  }));
}

export async function createClosure(
  pool: Pool,
  input: ClosureCreateInput,
  audit: { actorId: string; correlationId: string },
): Promise<{ id: string }> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO closures (starts_at, ends_at, reason, affected_services)
     VALUES ($1, $2, 'Geschlossen', $3::commercial_service_type[])
     RETURNING id`,
    [input.startsAt, input.endsAt, input.services],
  );
  const id = result.rows[0].id;
  await insertAuditEvent(pool, {
    actorId: audit.actorId,
    action: "operations.closure.create",
    entityType: "closure",
    entityId: id,
    afterData: { startsAt: input.startsAt, endsAt: input.endsAt, services: input.services },
    correlationId: audit.correlationId,
  });
  return { id };
}