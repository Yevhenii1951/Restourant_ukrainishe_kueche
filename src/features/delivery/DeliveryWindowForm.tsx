"use client";

import { useRouter } from "next/navigation";
import { saveDeliveryWindowAction } from "./adminActions";

export function DeliveryWindowForm() {
  const router = useRouter();
  return (
    <form
      action={async (formData) => {
        const result = await saveDeliveryWindowAction(formData);
        if (result.ok) router.refresh();
      }}
      className="grid gap-3 rounded-md border border-ink/10 bg-linen p-4 sm:grid-cols-2"
    >
      <label className="text-sm">Wochentag (0=So)<input required name="weekday" type="number" min="0" max="6" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">Kapazität pro Slot<input required name="capacity" type="number" min="1" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">Beginn<input required name="opensAt" type="time" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">Ende<input required name="closesAt" type="time" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <div className="flex items-end"><button className="rounded bg-ink px-4 py-2 text-sm text-paper">Lieferzeit speichern</button></div>
    </form>
  );
}
