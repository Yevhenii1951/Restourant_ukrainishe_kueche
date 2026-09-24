import { getServerPool } from "@/lib/db/serverPool";
import { listClosures } from "@/features/admin/postgresClosures";
import { ClosureForm } from "@/features/admin/components/ClosureForm";
export const dynamic = "force-dynamic"; export const metadata = { robots: { index: false, follow: false } };
export default async function ClosuresPage(): Promise<React.ReactNode> { const pool = getServerPool(); const closures = pool ? await listClosures(pool) : [];
  return <section className="space-y-6"><header><h1 className="font-display text-3xl font-semibold">Schliesszeiten</h1><p className="text-ink/75">Zeitlich begrenzte Ausnahmen fuer einzelne Dienste.</p></header><ClosureForm /><ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">{closures.map((closure) => <li key={closure.id} className="px-4 py-3 text-sm">{new Date(closure.startsAt).toLocaleString("de-DE")} bis {new Date(closure.endsAt).toLocaleString("de-DE")} · {closure.affectedServices.join(", ")}</li>)}</ul></section>; }
