"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PublicMenuItem } from "@/features/menu/domain";
import { formatEuroCents } from "@/lib/format";
import type { QuoteEngineResult } from "../service";

interface QuoteSummaryProps {
  result: QuoteEngineResult;
  items: PublicMenuItem[];
  locale: string;
}

export default function QuoteSummary({ result, items, locale }: QuoteSummaryProps) {
  const t = useTranslations("bestellen");
  const itemsById = new Map(items.map((item) => [item.id, item]));

  if (result.status === "error") {
    return (
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {t("serviceUnavailable")}
      </p>
    );
  }

  if (result.status === "needs-attention") {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <p>{t("needsAttention")}</p>
        <Link href="/warenkorb" className="mt-2 inline-block underline">
          {t("toCart")}
        </Link>
      </div>
    );
  }

  if (result.status === "rejected") {
    const message =
      result.reason === "minimum-not-met"
        ? t("minNotMet", {
            minimum: formatEuroCents(result.minimumCents ?? 0, locale),
            current: formatEuroCents(result.subtotalCents ?? 0, locale),
          })
        : result.reason === "promo-minimum-not-met"
          ? t("promoMinNotMet", { minimum: formatEuroCents(result.minimumCents ?? 0, locale) })
          : result.reason === "promo-invalid"
            ? t("promoInvalid")
            : result.reason === "slot-unavailable"
              ? t("slotUnavailable")
              : t("zoneNotEligible");
    return (
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {message}
      </p>
    );
  }

  const breakdown = result.breakdown;
  const expiresAt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(result.expiresAtMs));

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <h2 className="font-display text-xl font-semibold">{t("quoteTitle")}</h2>
      <p className="mt-1 text-sm text-ink/55">{t("quoteExpires", { expires: expiresAt })}</p>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink/50">
        {t("countedLines", { count: result.lines.length })}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {result.lines.map((line) => {
          const item = itemsById.get(line.menuItemId);
          return (
            <li key={line.menuItemId} className="flex justify-between gap-4">
              <span>
                {line.quantity}× {item?.name ?? line.menuItemId}
              </span>
              <span>{formatEuroCents(line.lineTotalCents, locale)}</span>
            </li>
          );
        })}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
        <div className="flex justify-between">
          <dt>{t("subtotal")}</dt>
          <dd>{formatEuroCents(breakdown.subtotalCents, locale)}</dd>
        </div>
        {breakdown.promoDiscountCents > 0 ? (
          <div className="flex justify-between text-kalyna">
            <dt>{t("discount", { code: breakdown.promoCodeApplied ?? "—" })}</dt>
            <dd>−{formatEuroCents(breakdown.promoDiscountCents, locale)}</dd>
          </div>
        ) : null}
        {breakdown.freeDeliveryApplied ? (
          <div className="flex justify-between">
            <dt>{t("deliveryFree")}</dt>
            <dd>{formatEuroCents(0, locale)}</dd>
          </div>
        ) : breakdown.deliveryFeeCents > 0 ? (
          <div className="flex justify-between">
            <dt>{t("deliveryFee")}</dt>
            <dd>{formatEuroCents(breakdown.deliveryFeeCents, locale)}</dd>
          </div>
        ) : null}
        {breakdown.tipCents > 0 ? (
          <div className="flex justify-between">
            <dt>{t("tip")}</dt>
            <dd>{formatEuroCents(breakdown.tipCents, locale)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 font-semibold">
        <span>{t("total")}</span>
        <span>{formatEuroCents(breakdown.totalCents, locale)}</span>
      </div>
      <p className="mt-3 text-xs text-ink/55">{t("minimumNote", { minimum: formatEuroCents(breakdown.minimumCents, locale) })}</p>
      <button
        type="button"
        disabled
        className="mt-4 w-full rounded-lg bg-kalyna px-4 py-2 font-medium text-white opacity-60"
      >
        {t("checkoutSoon")}
      </button>
    </div>
  );
}