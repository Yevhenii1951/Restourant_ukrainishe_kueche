"use client";
import { useState } from "react";
import { submitCateringInquiryAction } from "../actions";
const inputClass = "rounded-md border border-ink/15 bg-paper px-3 py-2";
export function CateringInquiryForm({ locale }: { locale: "de" | "en" | "uk" }): React.ReactElement {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "rate-limited">("idle");
  async function submit(formData: FormData): Promise<void> {
    setState("sending");
    const result = await submitCateringInquiryAction({ name: formData.get("name"), email: formData.get("email"), phone: formData.get("phone"), eventDate: formData.get("eventDate") || null, guestCount: formData.get("guestCount") || null, message: formData.get("message"), privacyAccepted: formData.get("privacyAccepted") === "on", privacyVersion: "1", locale, idempotencyKey: crypto.randomUUID(), website: formData.get("website"), sourceKey: "client" });
    setState(result.status === "created" ? "sent" : result.status === "rate-limited" ? "rate-limited" : "error");
  }
  if (state === "sent") return <p className="rounded-md border border-kalyna/30 bg-linen p-4 text-sm">Vielen Dank. Ihre unverbindliche Anfrage ist eingegangen.</p>;
  return <form action={submit} className="max-w-2xl space-y-4 rounded-md border border-ink/10 bg-linen p-5">
    <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1 text-sm">Name<input required name="name" className={inputClass} /></label><label className="flex flex-col gap-1 text-sm">E-Mail<input required name="email" type="email" className={inputClass} /></label><label className="flex flex-col gap-1 text-sm">Telefon<input required name="phone" type="tel" className={inputClass} /></label><label className="flex flex-col gap-1 text-sm">Wunschtermin<input name="eventDate" type="date" className={inputClass} /></label><label className="flex flex-col gap-1 text-sm">Personen<input name="guestCount" type="number" min="1" max="500" className={inputClass} /></label></div>
    <label className="flex flex-col gap-1 text-sm">Ihre Anfrage<textarea required name="message" maxLength={2000} rows={5} className={inputClass} /></label>
    <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="flex items-start gap-2 text-sm"><input required name="privacyAccepted" type="checkbox" />Ich habe die Datenschutzhinweise gelesen.</label>
    {state === "rate-limited" && <p className="text-sm text-red-800">Bitte versuchen Sie es spaeter erneut.</p>}{state === "error" && <p className="text-sm text-red-800">Anfrage momentan nicht verfuegbar.</p>}
    <button disabled={state === "sending"} className="rounded-md bg-kalyna px-4 py-2 font-medium text-white disabled:opacity-50">{state === "sending" ? "Wird gesendet..." : "Unverbindlich anfragen"}</button>
  </form>;
}
