import { z } from "zod";
import type { StaffContext } from "@/features/identity/domain";
import { canOperateReservations } from "@/features/identity/domain";
import type { CateringRunner } from "./service";
const transitionSchema = z.object({ inquiryId: z.string().uuid(), expectedVersion: z.coerce.number().int().min(1), targetState: z.enum(["contacted", "quoted", "confirmed", "cancelled"]) });
export type CateringQueueItem = { id: string; name: string; email: string; phone: string; eventDate: string | null; guestCount: number | null; message: string; state: string; version: number; createdAt: string };
export async function listCateringInquiries(pool: CateringRunner, actor: StaffContext): Promise<CateringQueueItem[] | null> {
  if (!canOperateReservations(actor)) return null;
  const result = await pool.query<{ id: string; name: string; email: string; phone: string; event_date: string | null; guest_count: number | null; message: string; state: string; version: number; created_at: Date }>("SELECT id, name, email, phone, event_date, guest_count, message, state::text, version, created_at FROM catering_inquiries WHERE state <> 'confirmed' AND state <> 'cancelled' ORDER BY created_at");
  return result.rows.map((row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, eventDate: row.event_date, guestCount: row.guest_count, message: row.message, state: row.state, version: row.version, createdAt: row.created_at.toISOString() }));
}
export async function transitionCateringInquiry(pool: CateringRunner, actor: StaffContext, correlationId: string, input: unknown): Promise<"applied" | "invalid" | "conflict" | "forbidden"> {
  if (!canOperateReservations(actor)) return "forbidden";
  const parsed = transitionSchema.safeParse(input); if (!parsed.success) return "invalid";
  const value = await pool.query<{ apply_catering_transition: { status: string } | null }>("SELECT apply_catering_transition($1::uuid,$2,$3::catering_state,$4::uuid,$5)", [parsed.data.inquiryId, parsed.data.expectedVersion, parsed.data.targetState, actor.id, correlationId]);
  const status = value.rows[0]?.apply_catering_transition?.status; return status === "applied" || status === "conflict" ? status : "invalid";
}
