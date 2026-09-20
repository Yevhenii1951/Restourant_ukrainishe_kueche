import { z } from "zod";
export const CATERING_PRIVACY_VERSION = "1";
export const cateringInquirySchema = z.object({
  name: z.string().trim().min(1).max(80), email: z.string().trim().email().max(254), phone: z.string().trim().min(3).max(30),
  eventDate: z.string().date().nullish(), guestCount: z.coerce.number().int().min(1).max(500).nullish(), message: z.string().trim().min(1).max(2000),
  privacyAccepted: z.literal(true), privacyVersion: z.literal(CATERING_PRIVACY_VERSION), locale: z.enum(["de", "en", "uk"]),
  idempotencyKey: z.string().uuid(), website: z.string().max(0), sourceKey: z.string().min(1).max(200),
}).strict();
export type CateringInquiryResult = { status: "created"; inquiry: { id: string; state: "new" }; replayed: boolean } | { status: "rate-limited" } | { status: "rejected" } | { status: "error" };
