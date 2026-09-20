import "server-only";
import { getCurrentStaff } from "@/features/identity/session";
import { getPool } from "@/features/order/runtime";
import { AdminOperationsService } from "./service";
export async function getAdminOperationsService(): Promise<AdminOperationsService | null> {
  const [actor, pool] = await Promise.all([getCurrentStaff(), getPool()]);
  return actor && pool ? new AdminOperationsService({ pool, actor, correlationId: crypto.randomUUID() }) : null;
}
export async function getDashboardForToday(): Promise<{ orderCount: number; revenueCents: number } | null> {
  const service = await getAdminOperationsService();
  if (!service) return null;
  const pool = getPool(); if (!pool) return null;
  const result = await pool.query<{ order_count: number; revenue_cents: string }>("SELECT * FROM admin_dashboard_for_day((now() AT TIME ZONE 'Europe/Berlin')::date)");
  const row = result.rows[0]; return row ? { orderCount: Number(row.order_count), revenueCents: Number(row.revenue_cents) } : null;
}
