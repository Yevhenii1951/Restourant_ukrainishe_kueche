"use client";

import { useRouter } from "next/navigation";
import { saveDeliveryZoneAction } from "./adminActions";

export function DeliveryZoneForm() {
  const router = useRouter();
  return (
    <form
      action={async (formData) => {
        const result = await saveDeliveryZoneAction(formData);
        if (result.ok) router.refresh();
      }}
      className="grid gap-3 rounded-md border border-ink/10 bg-linen p-4 sm:grid-cols-2"
    >
      <label className="text-sm">Name<input required name="name" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">PLZ (Komma getrennt)<input required name="postalCodes" inputMode="numeric" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">Gebühr (Cent)<input required name="feeCents" type="number" min="0" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">Mindestbestellung (Cent)<input required name="minimumCents" type="number" min="0" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <label className="text-sm">Kostenlos ab (Cent)<input required name="freeDeliveryCents" type="number" min="0" className="mt-1 w-full rounded border border-ink/20 bg-paper px-3 py-2" /></label>
      <div className="flex items-end"><button className="rounded bg-ink px-4 py-2 text-sm text-paper">Zone speichern</button></div>
    </form>
  );
}
