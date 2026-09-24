import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentStaff } from "@/features/identity/session";
import { canManageReservations } from "@/features/identity/domain";
import { getReservationPool } from "@/features/reservation/requestRuntime";
import { createPostgresReservationStore } from "@/features/reservation/postgresReservationStore";
import { TableForm } from "@/features/reservation/components/TableForm";
import { TableRowToggle } from "@/features/reservation/components/TableRowToggle";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function TischEditPage({
  params,
}: {
  params: Promise<{ locale: string; tableId: string }>;
}): Promise<React.ReactNode> {
  const { locale, tableId } = await params;
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
  const tables = pool
    ? await createPostgresReservationStore(pool).listTables()
    : [];
  const table = tables.find((item) => item.id === tableId);
  if (pool && !table) notFound();

  return (
    <section className="space-y-6">
      <Link href={`/${locale}/admin/tische`} className="text-sm underline-offset-4 hover:underline">
        &larr; Zurück zu den Tischen
      </Link>
      <h1 className="font-display text-3xl font-semibold">Tisch bearbeiten</h1>

      {!pool ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Datenbank nicht konfiguriert.
        </p>
      ) : (
        <div className="max-w-xl space-y-4 rounded-md border border-ink/10 bg-linen p-4">
          <TableForm
            table={{
              id: table!.id,
              internalLabel: table!.internalLabel,
              capacity: table!.capacity,
              area: table!.area,
              active: table!.active,
            }}
          />
          <TableRowToggle id={table!.id} active={table!.active} />
        </div>
      )}
    </section>
  );
}