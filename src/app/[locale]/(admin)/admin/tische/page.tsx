import Link from "next/link";
import { getCurrentStaff } from "@/features/identity/session";
import { canManageReservations } from "@/features/identity/domain";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";
import { createSupabaseReservationStore } from "@/features/reservation/supabaseReservationStore";
import { TableForm } from "@/features/reservation/components/TableForm";
import { TableRowToggle } from "@/features/reservation/components/TableRowToggle";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function TischePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;
  const staff = await getCurrentStaff();
  if (!staff) return null;

  const storeAvailable =
    Boolean(serverEnv.SUPABASE_URL) && Boolean(serverEnv.SUPABASE_SERVICE_ROLE_KEY);
  const tables = storeAvailable
    ? await createSupabaseReservationStore(getSupabaseServerClient()).listTables()
    : [];

  if (!canManageReservations(staff)) {
    return (
      <section className="space-y-6">
        <h1 className="font-display text-3xl font-semibold">Tische</h1>
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Diese Seite ist nur für das Management zugänglich.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Tische</h1>
        <p className="text-ink/75">
          Inventar der Sitzplätze für die Reservierungsplanung (Demo).
        </p>
      </header>

      <div className="rounded-md border border-ink/10 bg-linen p-4">
        <h2 className="font-display text-xl font-semibold">Neuer Tisch</h2>
        <TableForm />
      </div>

      {!storeAvailable ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Datenbank nicht konfiguriert – Liste leer.
        </p>
      ) : tables.length === 0 ? (
        <p className="text-sm text-ink/70">Noch keine Tische angelegt.</p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
          {tables.map((table) => (
            <li
              key={table.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  href={`/${locale}/admin/tische/${table.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {table.internalLabel}
                </Link>
                <p className="text-xs text-ink/60">
                  {table.capacity} Plätze · {table.area} · {table.active ? "aktiv" : "inaktiv"}
                </p>
              </div>
              <TableRowToggle id={table.id} active={table.active} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}