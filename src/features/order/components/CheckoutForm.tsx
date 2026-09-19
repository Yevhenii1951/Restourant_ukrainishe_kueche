"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Cart } from "@/features/cart/domain";
import { useCart } from "@/features/cart/cart-provider";
import { createPickupOrderAction } from "@/features/order/actions";
import type { OrderResult } from "@/features/order/service";

interface CheckoutFormProps {
  quoteToken: string;
  cart: Cart;
  slotStartUtc: string;
  promoCode: string | null;
  tipCents: number;
  locale: string;
}

export default function CheckoutForm({
  quoteToken,
  cart,
  slotStartUtc,
  promoCode,
  tipCents,
  locale,
}: CheckoutFormProps) {
  const t = useTranslations("bestellen");
  const router = useRouter();
  const { clearCart } = useCart();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function errorMessage(result: OrderResult): string {
    if (result.status === "needs-attention") return t("needsAttention");
    if (result.status === "conflict") return t("orderConflict");
    if (result.status === "error") return t("serviceUnavailable");
    if (result.status === "rejected") {
      switch (result.reason) {
        case "privacy-not-accepted":
          return t("privacyNotAccepted");
        case "quote-invalid":
          return t("quoteInvalid");
        case "quote-stale":
          return t("quoteStale");
        case "minimum-not-met":
          return t("minNotMet");
        case "promo-minimum-not-met":
          return t("promoMinNotMet");
        case "promo-invalid":
          return t("promoInvalid");
        case "zone-not-eligible":
          return t("zoneNotEligible");
        case "slot-unavailable":
          return t("slotUnavailable");
        default:
          return t("orderInput");
      }
    }
    return t("orderInput");
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createPickupOrderAction(
      {
        quoteToken,
        cart,
        fulfilment: "pickup",
        plz: null,
        promoCode,
        tipCents,
        slotStartUtc,
        paymentMethod: "cash_pickup",
        contact: { guestName, guestPhone, privacyVersion: "1", privacyAccepted },
        idempotencyKey,
      },
      { locale },
    );
    setBusy(false);
    if (result.status === "created") {
      clearCart();
      router.push(`/bestellung/${result.token}`);
      return;
    }
    setError(errorMessage(result));
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-ink/10 bg-paper p-5">
      <h2 className="font-display text-xl font-semibold">{t("checkoutTitle")}</h2>
      <p className="mt-1 text-sm text-ink/70">{t("paymentCash")}</p>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="guest-name" className="mb-1 block text-sm font-medium">
            {t("nameLabel")}
          </label>
          <input
            id="guest-name"
            required
            autoComplete="name"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="guest-phone" className="mb-1 block text-sm font-medium">
            {t("phoneLabel")}
          </label>
          <input
            id="guest-phone"
            required
            type="tel"
            autoComplete="tel"
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
            className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2">
        <input
          id="privacy"
          type="checkbox"
          required
          checked={privacyAccepted}
          onChange={(event) => setPrivacyAccepted(event.target.checked)}
          className="mt-1"
        />
        <label htmlFor="privacy" className="text-sm text-ink/80">
          {t("privacyLabel")}{" "}
          <Link href="/datenschutz" target="_blank" className="underline">
            {t("privacyLink")}
          </Link>
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-kalyna px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? t("ordering") : t("submitOrder")}
      </button>
    </form>
  );
}