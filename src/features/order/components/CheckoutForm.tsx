"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Cart } from "@/features/cart/domain";
import { useCart } from "@/features/cart/cart-provider";
import { createDeliveryOrderAction, createPickupOrderAction, createStripeCheckoutAction } from "@/features/order/actions";
import type { OrderResult } from "@/features/order/service";
import type { StripeCheckoutResult } from "@/features/payments/checkout";

type PaymentChoice = "cash" | "stripe_card" | "stripe_paypal";
type CheckoutResult = OrderResult | StripeCheckoutResult;

interface CheckoutFormProps {
  quoteToken: string;
  cart: Cart;
  fulfilment: "pickup" | "delivery";
  plz: string | null;
  slotStartUtc: string;
  promoCode: string | null;
  tipCents: number;
  locale: string;
  paypalEnabled: boolean;
}

export default function CheckoutForm(props: CheckoutFormProps) {
  const { quoteToken, cart, fulfilment, plz, slotStartUtc, promoCode, tipCents, locale, paypalEnabled } = props;
  const t = useTranslations("bestellen");
  const router = useRouter();
  const { clearCart } = useCart();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("Kassel");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("cash");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function errorMessage(result: CheckoutResult): string {
    if (result.status === "needs-attention") return t("needsAttention");
    if (result.status === "conflict") return t("orderConflict");
    if (result.status === "error") return t("serviceUnavailable");
    if (result.status !== "rejected") return t("orderInput");
    const map: Partial<Record<typeof result.reason, string>> = {
      "privacy-not-accepted": "privacyNotAccepted",
      "quote-invalid": "quoteInvalid",
      "quote-stale": "quoteStale",
      "minimum-not-met": "minNotMet",
      "promo-minimum-not-met": "promoMinNotMet",
      "promo-invalid": "promoInvalid",
      "zone-not-eligible": "zoneNotEligible",
      "slot-unavailable": "slotUnavailable",
      "pickup-paused": "pickupPaused",
      "paypal-unavailable": "paypalUnavailable",
      input: "orderInput",
    };
    return t(map[result.reason] ?? "orderInput");
  }

  function payload(method: string): Record<string, unknown> {
    return {
      quoteToken, cart, fulfilment, plz, promoCode, tipCents, slotStartUtc,
      paymentMethod: method,
      contact: { guestName, guestPhone, privacyVersion: "1", privacyAccepted },
      idempotencyKey,
      ...(fulfilment === "delivery"
        ? { deliveryAddress: { street, houseNumber, postalCode: plz ?? "", city, deliveryNote: deliveryNote || null } }
        : {}),
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = paymentChoice === "cash"
      ? await (fulfilment === "delivery" ? createDeliveryOrderAction : createPickupOrderAction)(
          payload(fulfilment === "delivery" ? "cash_delivery" : "cash_pickup"), { locale },
        )
      : await createStripeCheckoutAction(payload(paymentChoice), { locale });
    setBusy(false);
    if (result.status === "created") {
      clearCart();
      router.push(`/bestellung/${result.token}`);
      return;
    }
    if (result.status === "checkout") {
      clearCart();
      window.location.assign(result.redirectUrl);
      return;
    }
    setError(errorMessage(result));
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="premium-panel rounded-2xl p-5">
      <h2 className="font-display text-xl font-semibold">{t("checkoutTitle")}</h2>
      <fieldset className="mt-4 grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("paymentMethodLabel")}</legend>
        {(["cash", "stripe_card"] as const).map((choice) => (
          <label key={choice} className="rounded-lg border border-ink/20 px-3 py-2 text-sm">
            <input className="mr-2" type="radio" name="payment" checked={paymentChoice === choice} onChange={() => setPaymentChoice(choice)} />
            {choice === "cash" ? t(fulfilment === "delivery" ? "paymentCashDelivery" : "paymentCash") : t("paymentCard")}
          </label>
        ))}
        {paypalEnabled ? (
          <label className="rounded-lg border border-ink/20 px-3 py-2 text-sm">
            <input className="mr-2" type="radio" name="payment" checked={paymentChoice === "stripe_paypal"} onChange={() => setPaymentChoice("stripe_paypal")} />
            {t("paymentPaypal")}
          </label>
        ) : null}
      </fieldset>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium">{t("nameLabel")}<input required autoComplete="name" value={guestName} onChange={(event) => setGuestName(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
        <label className="block text-sm font-medium">{t("phoneLabel")}<input required type="tel" autoComplete="tel" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
        {fulfilment === "delivery" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">{t("streetLabel")}<input required value={street} onChange={(event) => setStreet(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
            <label className="text-sm">{t("houseNumberLabel")}<input required value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
            <label className="text-sm">{t("plzLabel")}<input required readOnly value={plz ?? ""} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
            <label className="text-sm">{t("cityLabel")}<input required value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
            <label className="text-sm sm:col-span-2">{t("deliveryNoteLabel")}<input value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-paper px-3 py-2" /></label>
          </div>
        ) : null}
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-ink/80">
        <input type="checkbox" required checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-1" />
        <span>{t("privacyLabel")} <Link href="/datenschutz" target="_blank" className="underline">{t("privacyLink")}</Link></span>
      </label>

      {error ? <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-60">
        {busy ? t("ordering") : paymentChoice === "cash" ? t("submitOrder") : t("continueToPayment")}
      </button>
    </form>
  );
}
