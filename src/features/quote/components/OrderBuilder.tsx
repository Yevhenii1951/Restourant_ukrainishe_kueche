"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PublicMenuItem } from "@/features/menu/domain";
import { requestQuoteAction, requestSlotsAction } from "../actions";
import type { QuoteEngineResult, SlotsResult } from "../service";
import { berlinDateKey } from "../slots";
import { useCart } from "../../cart/cart-provider";
import QuoteSummary from "./QuoteSummary";

interface OrderBuilderProps {
  items: PublicMenuItem[];
  locale: string;
}

type Fulfilment = "pickup" | "delivery";

export default function OrderBuilder({ items, locale }: OrderBuilderProps) {
  const t = useTranslations("bestellen");
  const { cart, hydrated } = useCart();
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [plz, setPlz] = useState("");
  const [date, setDate] = useState<string>(() => berlinDateKey(Date.now()));
  const [promoCode, setPromoCode] = useState("");
  const [tip, setTip] = useState("");
  const [slotStartUtc, setSlotStartUtc] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotsResult | null>(null);
  const [quote, setQuote] = useState<QuoteEngineResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hydrated) return null;

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-paper p-6 text-center">
        <h2 className="font-display text-2xl font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-2 text-ink/70">{t("emptyHint")}</p>
        <Link
          href="/speisekarte"
          className="mt-4 inline-block rounded-lg bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90"
        >
          {t("menuCta")}
        </Link>
      </div>
    );
  }

  async function loadSlots(): Promise<void> {
    setBusy(true);
    setQuote(null);
    setSlotStartUtc(null);
    const result = await requestSlotsAction({ fulfilment, plz: plz || null, date });
    setSlots(result);
    setBusy(false);
  }

  async function loadQuote(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    const parsedTip = Number.isFinite(Number(tip)) ? Math.max(0, Math.floor(Number(tip))) : 0;
    const result = await requestQuoteAction(
      {
        cart,
        fulfilment,
        plz: plz || null,
        promoCode: promoCode || null,
        tipCents: parsedTip,
        slotStartUtc,
      },
      { locale },
    );
    setQuote(result);
    setBusy(false);
  }

  const switchedFulfilment = (next: Fulfilment): void => {
    setFulfilment(next);
    setQuote(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form onSubmit={loadQuote} className="space-y-6">
        <fieldset className="flex gap-2">
          {(["pickup", "delivery"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={fulfilment === kind}
              onClick={() => switchedFulfilment(kind)}
              className={`rounded-lg border px-4 py-2 font-medium ${
                fulfilment === kind
                  ? "border-kalyna bg-kalyna text-white"
                  : "border-ink/20 bg-paper text-ink/70"
              }`}
            >
              {t(kind)}
            </button>
          ))}
        </fieldset>

        {fulfilment === "delivery" ? (
          <div className="grid gap-4">
            <div>
              <label htmlFor="plz" className="mb-1 block text-sm font-medium">
                {t("plzLabel")}
              </label>
              <input
                id="plz"
                inputMode="numeric"
                value={plz}
                onChange={(event) => setPlz(event.target.value)}
                placeholder={t("plzPlaceholder")}
                className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="date" className="mb-1 block text-sm font-medium">
                {t("dateLabel")}
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadSlots()}
              disabled={busy}
              className="rounded-lg border border-kalyna px-4 py-2 font-medium text-kalyna hover:opacity-80 disabled:opacity-50"
            >
              {busy ? "…" : t("showSlots")}
            </button>
          </div>
        ) : null}

        {slots?.status === "slots" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("slotLabel")}</legend>
            <p className="sr-only">{t("slotCount", { count: slots.slots.length })}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.slots.map((slot) => (
                <label
                  key={slot.startUtc}
                  className="cursor-pointer rounded-lg border border-ink/20 bg-paper px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="slot"
                    value={slot.startUtc}
                    checked={slotStartUtc === slot.startUtc}
                    onChange={() => {
                      setSlotStartUtc(slot.startUtc);
                      setQuote(null);
                    }}
                    className="mr-2"
                  />
                  {slot.labelLocal}
                </label>
              ))}
            </div>
          </fieldset>
        ) : slots?.status === "rejected" ? (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {t(slots.reason)}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="promo" className="mb-1 block text-sm font-medium">
              {t("promoLabel")}
            </label>
            <input
              id="promo"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              placeholder={t("promoPlaceholder")}
              className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="tip" className="mb-1 block text-sm font-medium">
              {t("tipLabel")}
            </label>
            <input
              id="tip"
              inputMode="numeric"
              value={tip}
              onChange={(event) => setTip(event.target.value)}
              className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-kalyna px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "…" : t("showQuote")}
        </button>
      </form>

      <aside>
        {quote ? <QuoteSummary result={quote} items={items} locale={locale} /> : null}
      </aside>
    </div>
  );
}