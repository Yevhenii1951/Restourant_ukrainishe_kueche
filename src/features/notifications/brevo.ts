import "server-only";
import type { EmailAdapter, EmailMessage } from "./domain";
export function createBrevoAdapter(apiKey: string): EmailAdapter { return { async send(message: EmailMessage, idempotencyKey: string): Promise<{ providerMessageId: string }> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": apiKey, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ sender: { name: "Kalyna Demo", email: "noreply@kalyna-demo.example" }, to: [{ email: message.to }], subject: message.subject, htmlContent: message.html, textContent: message.text }) });
  if (!response.ok) throw new Error("Brevo delivery failed"); const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("messageId" in body) || typeof body.messageId !== "string") throw new Error("Brevo response invalid"); return { providerMessageId: body.messageId };
}}; }
