"use client";

import { FormEvent, useMemo, useState } from "react";
import type { VoucherCheckoutResult, VoucherProduct } from "../domain";
import { createVoucherCheckoutAction } from "../actions";

interface VoucherPurchaseFormProps {
  locale: string;
  paypalEnabled: boolean;
  products: VoucherProduct[];
}

type PaymentMethod = "stripe_card" | "stripe_paypal";

function errorLabel(result: VoucherCheckoutResult): string {
  if (result.status === "error") return "Der Gutscheinverkauf ist momentan nicht verfügbar.";
  if (result.status === "rejected" && result.reason === "paypal-unavailable") return "PayPal ist für diese Stripe-Konfiguration nicht aktiviert.";
  if (result.status === "rejected" && result.reason === "not-found") return "Dieser Gutschein ist nicht verfügbar.";
  return "Bitte prüfen Sie Ihre Angaben.";
}

function formatEuro(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function VoucherPurchaseForm({ locale, paypalEnabled, products }: VoucherPurchaseFormProps) {
  const firstProduct = products[0]?.id ?? "";
  const [productId, setProductId] = useState(firstProduct);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe_card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => products.find((product) => product.id === productId), [productId, products]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createVoucherCheckoutAction({ productId, buyerEmail, paymentMethod }, { locale });
    setBusy(false);
    if (result.status === "checkout") {
      window.location.assign(result.redirectUrl);
      return;
    }
    setError(errorLabel(result));
  }

  if (products.length === 0) {
    return <p className="mt-6 rounded-lg border border-ink/10 p-4 text-sm">Gutscheine sind in dieser Demo gerade nicht verfügbar.</p>;
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8 max-w-xl rounded-lg border border-ink/10 bg-paper p-5">
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Betrag</legend>
        {products.map((product) => (
          <label key={product.id} className="flex items-center justify-between rounded-lg border border-ink/20 px-3 py-2 text-sm">
            <span>{product.name}</span>
            <span className="font-medium">{formatEuro(product.denominationCents, locale)}</span>
            <input className="ml-3" type="radio" name="product" checked={productId === product.id} onChange={() => setProductId(product.id)} />
          </label>
        ))}
      </fieldset>
      <label className="mt-4 block text-sm font-medium">
        E-Mail
        <input required type="email" autoComplete="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" />
      </label>
      <fieldset className="mt-4 grid gap-2">
        <legend className="mb-1 text-sm font-medium">Zahlung</legend>
        <label className="rounded-lg border border-ink/20 px-3 py-2 text-sm">
          <input className="mr-2" type="radio" name="payment" checked={paymentMethod === "stripe_card"} onChange={() => setPaymentMethod("stripe_card")} />
          Karte mit Stripe Checkout
        </label>
        {paypalEnabled ? (
          <label className="rounded-lg border border-ink/20 px-3 py-2 text-sm">
            <input className="mr-2" type="radio" name="payment" checked={paymentMethod === "stripe_paypal"} onChange={() => setPaymentMethod("stripe_paypal")} />
            PayPal mit Stripe Checkout
          </label>
        ) : null}
      </fieldset>
      <p className="mt-4 text-sm text-ink/70">Der Code wird erst nach bestätigter Stripe-Testzahlung erzeugt und per E-Mail zugestellt.</p>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p> : null}
      <button type="submit" disabled={busy || !selected} className="mt-4 w-full rounded-lg bg-kalyna px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60">
        {busy ? "Weiterleitung ..." : "Gutschein kaufen"}
      </button>
    </form>
  );
}
