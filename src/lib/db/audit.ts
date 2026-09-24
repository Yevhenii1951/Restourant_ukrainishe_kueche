import "server-only";
import type { Pool } from "pg";

export type AuditEventInput = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  correlationId: string;
};

export async function insertAuditEvent(
  pool: Pool,
  event: AuditEventInput,
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_events
       (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      event.actorId,
      event.action,
      event.entityType,
      event.entityId ?? null,
      event.beforeData ? JSON.stringify(event.beforeData) : null,
      event.afterData ? JSON.stringify(event.afterData) : null,
      event.correlationId,
    ],
  );
}