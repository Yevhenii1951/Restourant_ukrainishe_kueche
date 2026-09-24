import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentStaff } from "@/features/identity/session";
import { canManageReservations } from "@/features/identity/domain";
import { getReservationPool } from "@/features/reservation/requestRuntime";
import { createPostgresReservationStore } from "@/features/reservation/postgresReservationStore";
import { CombinationForm } from "@/features/reservation/components/CombinationForm";
import { CombinationRowToggle } from "@/features/reservation/components/CombinationRowToggle";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function KombinationEditPage({
  params,
}: {
  params: Promise<{ locale: string; combinationId: string }>;
}): Promise<React.ReactNode> {
  const { locale, combinationId } = await params;
  const staff = await getCurrentStaff();
  if (!staff) return null;

  if (!canManageReservations(staff)) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Diese Seite ist nur für das Management zugänglich.
      </p>
    );
  }

  const pool = await getReservationPool();
  const store = pool
    ? createPostgresReservationStore(pool)
    : null;
  const [tables, combinations] = store
    ? await Promise.all([store.listTables(), store.listCombinations()])
    : [[], []];
  const combination = combinations.find((item) => item.id === combinationId);
  if (pool && !combination) notFound();

  return (
    <section className="space-y-6">
      <Link
        href={`/${locale}/admin/kombinationen`}
        className="text-sm underline-offset-4 hover:underline"
      >
        &larr; Zurück zu den Kombinationen
      </Link>
      <h1 className="font-display text-3xl font-semibold">Kombination bearbeiten</h1>

      {!store ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Datenbank nicht konfiguriert.
        </p>
      ) : (
        <div className="max-w-xl space-y-4 rounded-md border border-ink/10 bg-linen p-4">
          <CombinationForm
            tables={tables}
            combination={{
              id: combination!.id,
              name: combination!.name,
              active: combination!.active,
              memberTableIds: combination!.memberTableIds,
            }}
          />
          <CombinationRowToggle id={combination!.id} active={combination!.active} />
        </div>
      )}
    </section>
  );
}