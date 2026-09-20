import Link from "next/link";
import { notFound } from "next/navigation";
import { staffGetReservationDetail } from "@/features/reservation/staffRuntime";
import { ReservationTransitionControls } from "@/features/reservation/components/ReservationTransitionControls";
import {
  formatReservationTime,
  RESERVATION_STATUS_LABELS,
} from "@/features/reservation/components/statusLabels";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ReservierungDetailPage({
  params,
}: {
  params: Promise<{ locale: string; reservationId: string }>;
}): Promise<React.ReactNode> {
  const { locale, reservationId } = await params;
  const result = await staffGetReservationDetail(reservationId);
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Dienst momentan nicht verfügbar.
      </p>
    );
  }
  const reservation = result.reservation;

  return (
    <section className="space-y-6">
      <header>
        <Link
          href={`/${locale}/admin/reservierungen`}
          className="text-sm text-ink/60 underline-offset-4 hover:underline"
        >
          ← Alle Reservierungen
        </Link>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Anfrage {reservation.number}
        </h1>
        <p className="text-ink/75">
          Status: <strong>{RESERVATION_STATUS_LABELS[reservation.status]}</strong> · Version{" "}
          {reservation.version}
        </p>
      </header>

      <ReservationTransitionControls
        reservationId={reservation.reservationId}
        expectedVersion={reservation.version}
        status={reservation.status}
      />

      <dl className="grid grid-cols-2 gap-3 rounded-md border border-ink/10 bg-linen p-4 text-sm">
        <Row label="Beginn">{formatReservationTime(reservation.startsAt)}</Row>
        <Row label="Ende">{formatReservationTime(reservation.endsAt)}</Row>
        <Row label="Hold bis">{formatReservationTime(reservation.expiresAt)}</Row>
        <Row label="Personen">{reservation.partySize}</Row>
        <Row label="Name">{reservation.guestName ?? "—"}</Row>
        <Row label="Telefon">{reservation.guestPhone ?? "—"}</Row>
        <Row label="E-Mail">{reservation.guestEmail ?? "—"}</Row>
        <Row label="Tische">{reservation.tables.join(", ") || "—"}</Row>
        <Row label="Wunschbereich">{reservation.seatingPreference ?? "—"}</Row>
        <Row label="Hinweise">{reservation.notes ?? "—"}</Row>
      </dl>

      <div>
        <h2 className="font-display text-xl font-semibold">Verlauf</h2>
        <ol className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen text-sm">
          {reservation.events.map((event, index) => (
            <li key={index} className="px-4 py-3">
              <p>
                {event.fromStatus ? RESERVATION_STATUS_LABELS[event.fromStatus] : "Neu"} →{" "}
                {RESERVATION_STATUS_LABELS[event.toStatus]}
              </p>
              <p className="text-xs text-ink/60">
                {formatReservationTime(event.createdAt)}
                {event.actorName ? ` · ${event.actorName}` : ""}
                {event.reason ? ` · ${event.reason}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-ink/60">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
