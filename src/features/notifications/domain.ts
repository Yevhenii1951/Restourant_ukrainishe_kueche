import { z } from "zod";
export const emailLocaleSchema = z.enum(["de", "en", "uk"]);
export const emailTemplateSchema = z.enum(["reservation_requested", "reservation_confirmed", "payment_refunded", "voucher_purchased"]);
export const emailOutboxRowSchema = z.object({ id: z.string().uuid(), recipient: z.string().email(), locale: emailLocaleSchema, template_key: emailTemplateSchema, payload: z.record(z.string(), z.string()) });
export type EmailOutboxRow = z.infer<typeof emailOutboxRowSchema>;
export interface EmailMessage { to: string; subject: string; html: string; text: string; }
export interface EmailAdapter { send(message: EmailMessage, idempotencyKey: string): Promise<{ providerMessageId: string }>; }
export function emailMessage(row: EmailOutboxRow, baseUrl: string): EmailMessage {
  if (row.template_key === "voucher_purchased") {
    const subjects = row.locale === "en" ? ["Kalyna voucher", "Your voucher code"]
      : row.locale === "uk" ? ["Сертифікат Kalyna", "Ваш код сертифіката"]
      : ["Kalyna Gutschein", "Ihr Gutscheincode"];
    const code = row.payload.code ?? "";
    return { to: row.recipient, subject: subjects[0], text: subjects[1] + ": " + code, html: "<p>" + subjects[1] + ": <strong>" + code + "</strong></p>" };
  }
  const link = new URL("/" + row.locale + "/reservierung/" + encodeURIComponent(row.payload.token ?? ""), baseUrl).toString();
  const labels = row.locale === "en" ? ["Reservation update", "View reservation"] : row.locale === "uk" ? ["Оновлення бронювання", "Переглянути бронювання"] : ["Reservierungsstatus", "Reservierung ansehen"];
  return { to: row.recipient, subject: labels[0], text: labels[0] + ": " + link, html: "<p>" + labels[0] + "</p><p><a href=\"" + link + "\">" + labels[1] + "</a></p>" };
}
