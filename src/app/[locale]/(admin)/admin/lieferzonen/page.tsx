import { getServerPool } from "@/lib/db/serverPool";
import { listDeliveryZones } from "@/features/delivery/postgresDelivery";
import { DeliveryZoneForm } from "@/features/delivery/DeliveryZoneForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function LieferzonenPage(): Promise<React.ReactNode> {
  const pool = getServerPool();
  const zones = pool ? await listDeliveryZones(pool) : [];
  return (
    <section className="space-y-6">
      <header><h1 className="font-display text-3xl font-semibold">Lieferzonen</h1><p className="text-ink/75">Exakte PLZ, Gebühr und Mindestbestellung.</p></header>
      <DeliveryZoneForm />
      <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
        {zones.map((zone) => <li key={zone.id} className="px-4 py-3 text-sm"><strong>{zone.name}</strong> · {zone.postalCodes.join(", ")} · {zone.feeCents} Cent · Mindestwert {zone.minimumCents} Cent · frei ab {zone.freeDeliveryCents} Cent</li>)}
      </ul>
    </section>
  );
}
