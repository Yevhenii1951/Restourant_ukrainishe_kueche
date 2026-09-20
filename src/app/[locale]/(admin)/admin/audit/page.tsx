import { getAdminOperationsService } from "@/features/admin/runtime";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function AuditPage(): Promise<React.ReactNode> {
  const service = await getAdminOperationsService(); const result = service ? await service.listAudit() : { status: "forbidden" as const };
  if (result.status !== "events") return <p className="text-sm text-ink/70">Kein Zugriff auf den Audit-Verlauf.</p>;
  return <section className="space-y-6"><header><h1 className="font-display text-3xl font-semibold">Audit-Verlauf</h1><p className="text-ink/75">Personenbezogene Daten und Geheimnisse werden ausgeblendet.</p></header>{result.events.length === 0 ? <p className="text-sm text-ink/70">Keine Eintraege.</p> : <ol className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen text-sm">{result.events.map((event, index) => <li key={index} className="px-4 py-3"><p className="font-medium">{event.action}</p><pre className="mt-1 overflow-x-auto text-xs text-ink/70">{JSON.stringify(event.afterData ?? {}, null, 2)}</pre></li>)}</ol>}</section>;
}
