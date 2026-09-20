import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DeliveryWindowForm } from "@/features/delivery/DeliveryWindowForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function LieferzeitenPage(): Promise<React.ReactNode> {
  const result = await getSupabaseServerClient()
    .from("service_windows")
    .select("id, weekday, opens_at, closes_at, capacity_per_slot, active")
    .eq("fulfilment", "delivery")
    .order("weekday");
  const windows = result.data ?? [];
  return (
    <section className="space-y-6">
      <header><h1 className="font-display text-3xl font-semibold">Lieferzeiten</h1><p className="text-ink/75">Wöchentliche Lieferfenster und Slot-Kapazität.</p></header>
      <DeliveryWindowForm />
      <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
        {windows.map((window) => <li key={window.id} className="px-4 py-3 text-sm">Tag {window.weekday} · {window.opens_at.slice(0, 5)}–{window.closes_at.slice(0, 5)} · Kapazität {window.capacity_per_slot}</li>)}
      </ul>
    </section>
  );
}
