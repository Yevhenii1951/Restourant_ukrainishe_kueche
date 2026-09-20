import { createHash } from "node:crypto";
import { cateringInquirySchema, type CateringInquiryResult } from "./domain";
export interface CateringRunner { query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>; }
interface Outcome { create_catering_inquiry: { outcome: string; id?: string; state?: string }; }
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");
export async function createCateringInquiry(raw: unknown, deps: { pool: CateringRunner; sourceKey?: string }): Promise<CateringInquiryResult> {
  const parsed = cateringInquirySchema.safeParse(raw);
  if (!parsed.success || parsed.data.website) return { status: "rejected" };
  const input = { ...parsed.data, sourceKey: deps.sourceKey ?? parsed.data.sourceKey };
  try {
    const result = await deps.pool.query<Outcome>("SELECT create_catering_inquiry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [hash(input.idempotencyKey), hash(input.sourceKey), input.name, input.email, input.phone, input.eventDate ?? null, input.guestCount ?? null, input.message, input.privacyVersion, input.locale]);
    const outcome = result.rows[0]?.create_catering_inquiry;
    if (outcome?.outcome === "rate-limited") return { status: "rate-limited" };
    if (outcome?.outcome === "created" || outcome?.outcome === "replayed") return { status: "created", inquiry: { id: String(outcome.id), state: "new" }, replayed: outcome.outcome === "replayed" };
    return { status: "error" };
  } catch { return { status: "error" }; }
}
