import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { formatEuroCents } from "@/lib/format";
import type { OrderState } from "@/features/order/domain";
import { getPublicOrder } from "@/features/order/service";
import { createOrderRuntime } from "@/features/order/runtime";
import CancelOrderForm from "@/features/order/components/CancelOrderForm";

export const dynamic = "force-dynamic";

const STATUS_KEYS: Record<OrderState, string> = {
  pending_confirmation: "statusPending",
  accepted: "statusAccepted",
  preparing: "statusPreparing",
  ready: "statusReady",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
  rejected: "statusRejected",
};

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string; token: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "bestellen" });
  return {
    title: translations("orderStatusTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function OrderStatusPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; token: string }> }>): Promise<React.ReactElement> {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("bestellen");
  const runtime = createOrderRuntime();

  if (!runtime) {
    return (
      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {t("serviceUnavailable")}
      </p>
    );
  }

  const result = await getPublicOrder(decodeURIComponent(token), runtime);
  if (result.status !== "order") notFound();
  const order = result.order;
  const scheduled = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(order.scheduledFor));

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("orderStatusTitle")}</h1>
        <p className="text-sm text-ink/60">{t("orderNumberLabel", { number: order.orderNumber })}</p>
        <p className="inline-block rounded-full bg-kalyna/10 px-3 py-1 text-sm font-medium text-kalyna">
          {t(STATUS_KEYS[order.state])}
        </p>
      </header>

      <p className="text-ink/80">
        {order.state === "pending_confirmation" ? t("orderPendingHint") : t("tokenHint")}
      </p>
      <p className="text-sm text-ink/70">{t("orderScheduledLabel", { time: scheduled })}</p>

      <ul className="space-y-1 rounded-2xl border border-ink/10 bg-paper p-4 text-sm">
        {order.lines.map((line) => (
          <li key={`${line.name}-${line.quantity}`} className="flex justify-between gap-4">
            <span>
              {line.quantity}× {line.name}
            </span>
            <span>{formatEuroCents(line.lineTotalCents, locale)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 rounded-2xl border border-ink/10 bg-paper p-4 text-sm">
        <div className="flex justify-between">
          <dt>{t("subtotal")}</dt>
          <dd>{formatEuroCents(order.subtotalCents, locale)}</dd>
        </div>
        {order.discountCents > 0 ? (
          <div className="flex justify-between text-kalyna">
            <dt>{t("discount", { code: "—" })}</dt>
            <dd>−{formatEuroCents(order.discountCents, locale)}</dd>
          </div>
        ) : null}
        {order.tipCents > 0 ? (
          <div className="flex justify-between">
            <dt>{t("tip")}</dt>
            <dd>{formatEuroCents(order.tipCents, locale)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-ink/10 pt-2 font-semibold">
          <dt>{t("total")}</dt>
          <dd>{formatEuroCents(order.totalCents, locale)}</dd>
        </div>
      </dl>

      {order.state === "pending_confirmation" ? (
        <CancelOrderForm token={decodeURIComponent(token)} />
      ) : null}

      <p className="text-xs text-ink/50">{t("tokenHint")}</p>
      <Link href="/speisekarte" className="inline-block underline">
        {t("backToMenu")}
      </Link>
    </section>
  );
}