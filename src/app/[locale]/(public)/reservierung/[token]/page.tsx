import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getPublicReservation } from "@/features/reservation/requestService";
import { createReservationRequestRuntime } from "@/features/reservation/requestRuntime";
import CancelReservationButton from "@/features/reservation/components/CancelReservationButton";

export const dynamic = "force-dynamic";

const STATUS_KEYS: Record<string, string> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  declined: "statusDeclined",
  cancelled: "statusCancelled",
  expired: "statusExpired",
  completed: "statusCompleted",
  no_show: "statusNoShow",
};

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string; token: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "reservierung" });
  return {
    title: translations("statusTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ReservationStatusPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string; token: string }>;
}>): Promise<React.ReactElement> {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reservierung");
  const runtime = createReservationRequestRuntime();

  if (!runtime) {
    return (
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {t("serviceUnavailable")}
      </p>
    );
  }

  const result = await getPublicReservation(decodeURIComponent(token), runtime);
  if (result.status !== "reservation") notFound();
  const { reservation } = result;

  const formatDateTime = (value: string): string =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(new Date(value));

  const cancellable = reservation.status === "pending" || reservation.status === "confirmed";

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("statusTitle")}</h1>
        <p className="text-sm text-ink/60">{t("statusNumber", { number: reservation.number })}</p>
        <p className="inline-block rounded-full bg-kalyna/10 px-3 py-1 text-sm font-medium text-kalyna">
          {t(STATUS_KEYS[reservation.status] ?? "statusPending")}
        </p>
      </header>

      <dl className="space-y-2 rounded-2xl border border-ink/10 bg-paper p-5 text-sm">
        <div className="flex justify-between">
          <dt>{t("statusParty")}</dt>
          <dd>{reservation.partySize}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("statusStartsAt")}</dt>
          <dd>{formatDateTime(reservation.startsAt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("statusEndsAt")}</dt>
          <dd>{formatDateTime(reservation.endsAt)}</dd>
        </div>
        {reservation.status === "pending" ? (
          <div className="flex justify-between text-ink/70">
            <dt>{t("statusExpiresAt")}</dt>
            <dd>{formatDateTime(reservation.expiresAt)}</dd>
          </div>
        ) : null}
      </dl>

      {cancellable ? <CancelReservationButton token={decodeURIComponent(token)} /> : null}

      <p className="text-xs text-ink/50">{t("statusCutoff")}</p>
      <Link href="/reservierung" className="inline-block underline">
        {t("backToSlots")}
      </Link>
    </section>
  );
}