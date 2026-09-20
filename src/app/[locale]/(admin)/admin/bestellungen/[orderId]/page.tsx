import Link from "next/link";
import { notFound } from "next/navigation";
import { staffGetOrderDetail } from "@/features/order/staffRuntime";
import { OrderTransitionControls } from "@/features/order/components/OrderTransitionControls";
import {
  formatEuros,
  formatSchedule,
  ORDER_STATUS_LABELS,
} from "@/features/order/components/statusLabels";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function BestellungDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}): Promise<React.ReactNode> {
  const { locale, orderId } = await params;
  const result = await staffGetOrderDetail(orderId);
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Dienst momentan nicht verfügbar.
      </p>
    );
  }
  const order = result.order;

  return (
    <section className="space-y-6">
      <header>
        <Link
          href={`/${locale}/admin/bestellungen`}
          className="text-sm text-ink/60 underline-offset-4 hover:underline"
        >
          ← Alle Bestellungen
        </Link>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Auftrag {order.orderNumber}
        </h1>
        <p className="text-ink/75">
          Status: <strong>{ORDER_STATUS_LABELS[order.state]}</strong> · Version{" "}
          {order.version}
        </p>
      </header>

      <OrderTransitionControls
        orderId={order.orderId}
        expectedVersion={order.version}
        state={order.state}
      />

      <dl className="grid grid-cols-2 gap-3 rounded-md border border-ink/10 bg-linen p-4 text-sm">
        <Row label="Abholtermin">{formatSchedule(order.scheduledFor)}</Row>
        <Row label="Summe">{formatEuros(order.totalCents)}</Row>
        <Row label="Zwischensumme">{formatEuros(order.subtotalCents)}</Row>
        <Row label="Rabatt">{formatEuros(order.discountCents)}</Row>
        <Row label="Trinkgeld">{formatEuros(order.tipCents)}</Row>
        <Row label="Fertigstellungszeit">
          {order.acceptedEstimateMinutes ? `${order.acceptedEstimateMinutes} min` : "—"}
        </Row>
        <Row label="Name">{order.guestName ?? "—"}</Row>
        <Row label="Telefon">{order.guestPhone ?? "—"}</Row>
      </dl>

      <div>
        <h2 className="font-display text-xl font-semibold">Artikel</h2>
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
          {order.lines.map((line, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p>
                  <span className="font-medium">
                    {line.quantity}× {line.name}
                  </span>
                </p>
                {line.modifiers.map((modifier, modIndex) => (
                  <p key={modIndex} className="text-xs text-ink/60">
                    → {modifier.groupName}: {modifier.optionName}
                  </p>
                ))}
              </div>
              <span className="font-semibold">{formatEuros(line.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold">Verlauf</h2>
        <ol className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen text-sm">
          {order.events.map((event, index) => (
            <li key={index} className="px-4 py-3">
              <p>
                {event.fromState ? ORDER_STATUS_LABELS[event.fromState] : "Neu"} →{" "}
                {ORDER_STATUS_LABELS[event.toState]}
              </p>
              <p className="text-xs text-ink/60">
                {formatSchedule(event.createdAt)}
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