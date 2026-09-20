import type { StaffContext } from "@/features/identity/domain";
import { canExportCustomerData } from "@/features/identity/domain";

export interface AdminRunner {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

type ExportRow = { order_number: string; guest_name: string | null; guest_phone: string | null };
type AuditRow = { action: string; after_data: Record<string, unknown> | null };

function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export class AdminOperationsService {
  constructor(private readonly deps: { pool: AdminRunner; actor: StaffContext; correlationId?: string }) {}

  async exportCustomers(): Promise<{ status: "forbidden" } | { status: "exported"; csv: string }> {
    if (!canExportCustomerData(this.deps.actor)) return { status: "forbidden" };
    const result = await this.deps.pool.query<ExportRow>(
      "SELECT * FROM admin_customer_export()",
    );
    const lines = [["orderNumber", "guestName", "guestPhone"], ...result.rows.map((row) => [row.order_number, row.guest_name ?? "", row.guest_phone ?? ""])];
    await this.deps.pool.query(
      "INSERT INTO audit_events (actor_id, action, entity_type, after_data, correlation_id) VALUES ($1, 'admin.customer.export', 'customer_export', $2::jsonb, $3)",
      [this.deps.actor.id, JSON.stringify({ rows: result.rows.length }), this.deps.correlationId ?? null],
    );
    return { status: "exported", csv: lines.map((line) => line.map(csvCell).join(",")).join("\r\n") };
  }

  async listAudit(): Promise<{ status: "forbidden" } | { status: "events"; events: { action: string; afterData: Record<string, unknown> | null }[] }> {
    if (!this.deps.actor.active || this.deps.actor.role !== "ADMIN") return { status: "forbidden" };
    const result = await this.deps.pool.query<AuditRow>("SELECT * FROM admin_audit_events() LIMIT 100");
    return { status: "events", events: result.rows.map((row) => ({ action: row.action, afterData: row.after_data })) };
  }
}
