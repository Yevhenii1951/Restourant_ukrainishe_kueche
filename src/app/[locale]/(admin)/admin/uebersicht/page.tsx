import Link from "next/link";
import { getDashboardForToday } from "@/features/admin/runtime";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }): Promise<React.ReactNode> {
  const { locale } = await params; const dashboard = await getDashboardForToday();
  if (!dashboard) return <p className="text-sm text-ink/70">Dienst momentan nicht verfuegbar.</p>;
  return <section className="space-y-6"><header><h1 className="font-display text-3xl font-semibold">Betriebsuebersicht</h1><p className="text-ink/75">Heute in Europe/Berlin, ohne stornierte oder abgelehnte Bestellungen.</p></header><dl className="grid gap-4 sm:grid-cols-2"><Metric label="Gueltige Bestellungen" value={String(dashboard.orderCount)} /><Metric label="Umsatz" value={new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(dashboard.revenueCents / 100)} /></dl><nav className="flex flex-wrap gap-4 text-sm underline-offset-4"><Link href={`/${locale}/admin/lieferzeiten`} className="hover:underline">Oeffnungszeiten</Link><Link href={`/${locale}/admin/lieferzonen`} className="hover:underline">Lieferung</Link><Link href={`/${locale}/admin/tische`} className="hover:underline">Tische</Link><Link href={`/${locale}/admin/bestellungen`} className="hover:underline">Bestellungen</Link></nav></section>;
}
function Metric({ label, value }: { label: string; value: string }): React.ReactElement { return <div className="rounded-md border border-ink/10 bg-linen p-4"><dt className="text-sm text-ink/70">{label}</dt><dd className="mt-1 font-display text-2xl font-semibold">{value}</dd></div>; }
