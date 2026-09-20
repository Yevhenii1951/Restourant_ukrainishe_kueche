import { getCurrentStaff } from "@/features/identity/session";
import { getReservationPool } from "@/features/reservation/requestRuntime";
import { listCateringInquiries } from "@/features/catering/staff";
import { CateringTransitionControls } from "@/features/catering/components/CateringTransitionControls";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function CateringAdminPage(): Promise<React.ReactNode> {
  const [actor, pool] = await Promise.all([getCurrentStaff(), getReservationPool()]);
  const inquiries = actor && pool ? await listCateringInquiries(pool, actor) : null;
  if (!inquiries) return <p className="text-sm text-ink/70">Dienst momentan nicht verfuegbar.</p>;
  return <section className="space-y-6"><header><h1 className="font-display text-3xl font-semibold">Catering-Anfragen</h1><p className="text-ink/75">Unverbindliche Anfragen ohne Preis- oder Vertragszusage.</p></header>{inquiries.length === 0 ? <p className="text-sm text-ink/70">Keine offenen Anfragen.</p> : <ul className="space-y-3">{inquiries.map((item) => <li key={item.id} className="space-y-3 rounded-md border border-ink/10 bg-linen p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-medium">{item.name} · {item.guestCount ?? "-"} Personen</p><p className="text-sm">{item.email} · {item.phone} · {item.eventDate ?? "Termin offen"}</p><p className="mt-2 text-sm text-ink/75">{item.message}</p></div><p className="text-sm capitalize">{item.state}</p></div><CateringTransitionControls id={item.id} version={item.version} state={item.state} /></li>)}</ul>}</section>;
}
