"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatEuroCents } from "@/lib/format";
import { lookupGuestAnfragen, type GuestLookupState } from "../actions";
import {
  GUEST_ORDER_STATE_KEYS,
  GUEST_RESERVATION_STATE_KEYS,
  type GuestOrderSummary,
  type GuestReservationSummary,
} from "../domain";

function formatWhen(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

const ERROR_KEYS: Record<string, string> = {
  "invalid-phone": "errorInvalidPhone",
  "rate-limited": "errorRateLimited",
  "service-unavailable": "errorService",
};

export default function MeineAnfragenForm(): React.ReactElement {
  const t = useTranslations("meineAnfragen");
  const locale = useLocale();
  const [state, action, pending] = useActionState<GuestLookupState, FormData>(
    lookupGuestAnfragen,
    { status: "idle" },
  );

  const orders: GuestOrderSummary[] =
    state.status === "success"
      ? state.entries.filter((entry) => entry.kind === "order")
      : [];
  const reservations: GuestReservationSummary[] =
    state.status === "success"
      ? state.entries.filter((entry) => entry.kind === "reservation")
      : [];

  return (
    <div className="space-y-6">
      <form action={action} className="premium-surface flex flex-wrap items-end gap-4 rounded-2xl p-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">{t("phoneLabel")}</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            minLength={5}
            maxLength={30}
            placeholder={t("phonePlaceholder")}
            className="w-full rounded-md border border-ink/15 bg-linen px-3 py-2 sm:w-72"
          />
        </label>
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? t("busy") : t("lookupCta")}
        </button>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {t(ERROR_KEYS[state.code] ?? "errorService")}
        </p>
      ) : null}

      {state.status === "success" && state.entries.length === 0 ? (
        <p className="premium-surface rounded-2xl p-6 text-ink/70">{t("empty")}</p>
      ) : null}

      {orders.length > 0 ? (
        <section className="space-y-3" aria-label={t("ordersHeading")}>
          <h2 className="font-display text-2xl font-semibold text-ink">{t("ordersHeading")}</h2>
          <ul className="space-y-3">
            {orders.map((order) => {
              const stateKey = GUEST_ORDER_STATE_KEYS[order.state] ?? "unknownState";
              return (
                <li key={`order-${order.number}`} className="premium-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
                  <div>
                    <p className="font-semibold text-ink">
                      {t(order.fulfilment === "pickup" ? "pickupOrder" : "deliveryOrder")}{" "}
                      <span className="text-brand">#{order.number}</span>
                    </p>
                    <p className="text-sm text-ink/70">{formatWhen(order.scheduledFor, locale)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">{t(stateKey)}</p>
                    <p className="text-sm text-ink/70">{formatEuroCents(order.totalCents, locale)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {reservations.length > 0 ? (
        <section className="space-y-3" aria-label={t("reservationsHeading")}>
          <h2 className="font-display text-2xl font-semibold text-ink">{t("reservationsHeading")}</h2>
          <ul className="space-y-3">
            {reservations.map((reservation) => {
              const stateKey = GUEST_RESERVATION_STATE_KEYS[reservation.status] ?? "unknownState";
              return (
                <li key={`reservation-${reservation.number}`} className="premium-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
                  <div>
                    <p className="font-semibold text-ink">
                      {t("reservationEntry")} <span className="text-brand">#{reservation.number}</span>
                    </p>
                    <p className="text-sm text-ink/70">
                      {formatWhen(reservation.startsAt, locale)} · {reservation.partySize} {t("persons")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">{t(stateKey)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}