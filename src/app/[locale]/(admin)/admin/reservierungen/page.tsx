import Link from "next/link";
import { staffListReservations } from "@/features/reservation/staffRuntime";
import {
  formatReservationTime,
  RESERVATION_STATUS_LABELS,
} from "@/features/reservation/components/statusLabels";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ReservierungenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;
  const result = await staffListReservations();
  const reservations = result.status === "reservations" ? result.items : [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Reservierungen</h1>
        <p className="text-ink/75">Offene und kommende Tischanfragen.</p>
      </header>

      {result.status === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Dienst momentan nicht verfügbar.
        </p>
      ) : reservations.length === 0 ? (
        <p className="text-sm text-ink/70">Keine Reservierungen.</p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
          {reservations.map((reservation) => (
            <li
              key={reservation.reservationId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  href={`/${locale}/admin/reservierungen/${reservation.reservationId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Anfrage {reservation.number} — {reservation.partySize} Personen
                </Link>
                <p className="text-xs text-ink/60">
                  {formatReservationTime(reservation.startsAt)} ·{" "}
                  {RESERVATION_STATUS_LABELS[reservation.status]} · Version {reservation.version}
                </p>
              </div>
              <div className="text-right text-sm">
                <p>{reservation.guestName ?? "—"}</p>
                <p className="text-xs text-ink/60">{reservation.guestPhone ?? "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
