import Link from "next/link";
import { getCurrentStaff } from "@/features/identity/session";
import { canManageReservations } from "@/features/identity/domain";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { createSupabaseReservationStore } from "@/features/reservation/supabaseReservationStore";
import { CombinationForm } from "@/features/reservation/components/CombinationForm";
import { CombinationRowToggle } from "@/features/reservation/components/CombinationRowToggle";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function KombinationenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;
  const staff = await getCurrentStaff();
  if (!staff) return null;

  const storeAvailable =
    Boolean(serverEnv.SUPABASE_URL) && Boolean(serverEnv.SUPABASE_SERVICE_ROLE_KEY);
  const store = createSupabaseReservationStore(getSupabaseServerClient());
  const [tables, combinations] = storeAvailable
    ? await Promise.all([store.listTables(), store.listCombinations()])
    : [[], []];
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  if (!canManageReservations(staff)) {
    return (
      <section className="space-y-6">
        <h1 className="font-display text-3xl font-semibold">Tischkombinationen</h1>
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Diese Seite ist nur für das Management zugänglich.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Tischkombinationen</h1>
        <p className="text-ink/75">
          Kombinationen bündeln Tische für größere Gesellschaften; die Plätze
          werden automatisch aus den Tischen berechnet.
        </p>
      </header>

      <div className="rounded-md border border-ink/10 bg-linen p-4">
        <h2 className="font-display text-xl font-semibold">Neue Kombination</h2>
        <CombinationForm tables={tables} />
      </div>

      {!storeAvailable ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Datenbank nicht konfiguriert – Liste leer.
        </p>
      ) : combinations.length === 0 ? (
        <p className="text-sm text-ink/70">Noch keine Kombinationen angelegt.</p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
          {combinations.map((combination) => {
            const memberLabels = combination.memberTableIds
              .map((tableId) => tablesById.get(tableId)?.internalLabel ?? "?")
              .join(", ");
            return (
              <li
                key={combination.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/${locale}/admin/kombinationen/${combination.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {combination.name}
                  </Link>
                  <p className="text-xs text-ink/60">
                    {combination.capacity} Plätze · {memberLabels} ·{" "}
                    {combination.active ? "aktiv" : "inaktiv"}
                  </p>
                </div>
                <CombinationRowToggle id={combination.id} active={combination.active} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}