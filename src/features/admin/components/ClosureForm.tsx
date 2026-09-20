"use client";
import { useState } from "react";
import { createClosureAction } from "../closureActions";
export function ClosureForm(): React.ReactElement {
  const [message, setMessage] = useState<string | null>(null);
  async function submit(formData: FormData): Promise<void> {
    const result = await createClosureAction({ startsAt: new Date(String(formData.get("startsAt"))).toISOString(), endsAt: new Date(String(formData.get("endsAt"))).toISOString(), services: formData.getAll("services") });
    setMessage(result.ok ? "Schliesszeit gespeichert." : "Schliesszeit konnte nicht gespeichert werden.");
  }
  return <form action={submit} className="flex flex-wrap items-end gap-3 rounded-md border border-ink/10 bg-linen p-4"><label className="flex flex-col gap-1 text-sm">Beginn<input required name="startsAt" type="datetime-local" className="rounded-md border border-ink/15 bg-paper px-2 py-1" /></label><label className="flex flex-col gap-1 text-sm">Ende<input required name="endsAt" type="datetime-local" className="rounded-md border border-ink/15 bg-paper px-2 py-1" /></label><fieldset className="flex gap-3 text-sm"><legend className="sr-only">Dienste</legend>{["pickup", "delivery", "reservation"].map((service) => <label key={service} className="flex gap-1"><input name="services" type="checkbox" value={service} />{service}</label>)}</fieldset><button className="rounded-md bg-kalyna px-3 py-2 text-sm font-medium text-white">Schliesszeit anlegen</button>{message && <p className="text-sm text-ink/70">{message}</p>}</form>;
}
