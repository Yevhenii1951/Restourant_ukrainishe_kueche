import { setRequestLocale } from "next-intl/server";
import { serverEnv } from "@/lib/env/server";
import { listVoucherProductsAction } from "@/features/vouchers/actions";
import VoucherPurchaseForm from "@/features/vouchers/components/VoucherPurchaseForm";

interface GutscheinePageProps {
  params: Promise<{ locale: string }>;
}

export default async function GutscheinePage({ params }: GutscheinePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const products = await listVoucherProductsAction(locale);
  const paypalEnabled = serverEnv.STRIPE_PAYPAL_ENABLED === "true";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-kalyna">Demo-Gutscheine</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Kalyna Gutschein kaufen</h1>
      <p className="mt-4 max-w-2xl text-ink/75">
        Feste Gutscheinbeträge für diese Portfolio-Demo. Der Kauf läuft über Stripe-Testmodus;
        ein echter Gutschein oder Zahlungsanspruch entsteht nicht.
      </p>
      <VoucherPurchaseForm locale={locale} paypalEnabled={paypalEnabled} products={products} />
    </main>
  );
}
