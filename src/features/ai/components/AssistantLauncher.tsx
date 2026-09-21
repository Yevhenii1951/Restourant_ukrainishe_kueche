"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export default function AssistantLauncher({ locale }: Readonly<{ locale: string }>): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(formData: FormData): Promise<void> {
    const message = String(formData.get("message") ?? "").trim();
    if (!message) return;
    setFailed(false);
    setAnswer(null);
    const response = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, locale }) });
    if (!response.ok) { setFailed(true); return; }
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null && "answer" in payload && typeof payload.answer === "string") setAnswer(payload.answer);
    else setFailed(true);
  }

  if (!open) return <button type="button" className="fixed bottom-20 right-4 z-30 rounded-full bg-kalyna px-4 py-3 font-medium text-white shadow-lg sm:bottom-6" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>Frage zum Restaurant</button>;

  return <section role="dialog" aria-modal="true" aria-label="Restaurant-Assistent" className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] space-y-4 rounded-2xl border border-ink/15 bg-paper p-5 shadow-xl">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Restaurant-Assistent</h2><p className="text-sm text-ink/70">Nur Fragen zu Speisekarte, Öffnungszeiten und dieser Website. Keine Bestellungen oder Reservierungen.</p></div><button type="button" aria-label="Assistent schließen" className="min-h-11 min-w-11" onClick={() => setOpen(false)}>×</button></div>
    {failed ? <p role="alert" className="text-sm text-ink/80">Der Assistent ist gerade nicht verfügbar. Nutze bitte Speisekarte oder Kontakt.</p> : null}
    {answer ? <p role="status" className="rounded-lg bg-ink/5 p-3 text-sm text-ink/80">{answer}</p> : null}
    <form action={submit} className="space-y-3"><label className="sr-only" htmlFor="ai-message">Frage</label><input ref={inputRef} id="ai-message" name="message" maxLength={800} required className="w-full rounded-lg border border-ink/20 px-3 py-2" placeholder="Deine Frage" /><button className="min-h-11 rounded-lg bg-kalyna px-4 py-2 font-medium text-white">Senden</button></form>
    <p className="text-sm"><Link className="underline" href={`/${locale}/speisekarte`}>Speisekarte</Link>{" · "}<Link className="underline" href={`/${locale}/kontakt`}>Kontakt</Link></p>
  </section>;
}
