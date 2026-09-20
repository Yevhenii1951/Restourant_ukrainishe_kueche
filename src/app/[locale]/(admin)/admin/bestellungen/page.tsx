import Link from "next/link";
import { staffListActiveOrders, staffGetPickupAccepting } from "@/features/order/staffRuntime";
import { getCurrentStaff } from "@/features/identity/session";
import { AvailabilityToggle } from "@/features/order/components/AvailabilityToggle";
import { ExportCsvButton } from "@/features/order/components/ExportCsvButton";
import {
  formatEuros,
  formatSchedule,
  ORDER_STATUS_LABELS,
} from "@/features/order/components/statusLabels";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function BestellungenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;
  const staff = await getCurrentStaff();
  if (!staff) return null;

  const [listResult, accepting] = await Promise.all([
    staffListActiveOrders(),
    staffGetPickupAccepting(),
  ]);
  const orders = listResult.status === "orders" ? listResult.items : [];
  const broker = listResult.status === "error";

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Bestellungen</h1>
        <p className="text-ink/75">Offene Abholbestellungen für heute.</p>
      </header>

      <AvailabilityToggle enabled={accepting.enabled} />
      <div className="flex justify-end">
        <ExportCsvButton />
      </div>

      {broker ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Dienst momentan nicht verfügbar.
        </p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-ink/70">Keine offenen Bestellungen.</p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
          {orders.map((order) => (
            <li
              key={order.orderId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  href={`/${locale}/admin/bestellungen/${order.orderId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Auftrag {order.orderNumber} — {order.lineSummary}
                </Link>
                <p className="text-xs text-ink/60">
                  {formatSchedule(order.scheduledFor)} ·{" "}
                  {ORDER_STATUS_LABELS[order.state]} ·{" "}
                  {order.itemCount} Artikel
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatEuros(order.totalCents)}</p>
                <p className="text-xs text-ink/60">{order.guestName ?? "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}