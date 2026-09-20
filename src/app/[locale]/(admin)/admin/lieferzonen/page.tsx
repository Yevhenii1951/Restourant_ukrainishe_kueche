import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DeliveryZoneForm } from "@/features/delivery/DeliveryZoneForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function LieferzonenPage(): Promise<React.ReactNode> {
  const result = await getSupabaseServerClient()
    .from("delivery_zones")
    .select("id, name, postal_codes, fee_cents, minimum_cents, free_delivery_cents, active")
    .order("name");
  const zones = result.data ?? [];
  return (
    <section className="space-y-6">
      <header><h1 className="font-display text-3xl font-semibold">Lieferzonen</h1><p className="text-ink/75">Exakte PLZ, Gebühr und Mindestbestellung.</p></header>
      <DeliveryZoneForm />
      <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
        {zones.map((zone) => <li key={zone.id} className="px-4 py-3 text-sm"><strong>{zone.name}</strong> · {zone.postal_codes.join(", ")} · {zone.fee_cents} Cent · Mindestwert {zone.minimum_cents} Cent · frei ab {zone.free_delivery_cents} Cent</li>)}
      </ul>
    </section>
  );
}
