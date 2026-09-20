"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { requestReservationSlotsAction } from "../actions";
import type { ReservationSlotsResult } from "../availability";
import { berlinDateKey } from "@/features/quote/slots";

const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function ReservationAvailability() {
  const t = useTranslations("reservierung");
  const [date, setDate] = useState<string>(() => berlinDateKey(Date.now()));
  const [minDate] = useState<string>(() => berlinDateKey(Date.now()));
  const [partySize, setPartySize] = useState(2);
  const [result, setResult] = useState<ReservationSlotsResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadSlots(): Promise<void> {
    setBusy(true);
    setResult(null);
    const outcome = await requestReservationSlotsAction({ date, partySize });
    setResult(outcome);
    setBusy(false);
  }

  return (
    <form
      className="max-w-xl space-y-4 rounded-2xl border border-ink/10 bg-linen p-6"
      action={loadSlots}
    >
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("dateLabel")}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            min={minDate}
            className="rounded-md border border-ink/15 bg-paper px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("partyLabel")}
          <select
            value={partySize}
            onChange={(event) => setPartySize(Number(event.target.value))}
            className="rounded-md border border-ink/15 bg-paper px-3 py-2"
          >
            {PARTY_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("loading") : t("showSlots")}
        </button>
      </div>

      {result?.status === "error" && (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t("serviceUnavailable")}
        </p>
      )}
      {result?.status === "rejected" && (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t(result.reason)}
        </p>
      )}
      {result?.status === "slots" && (
        <div>
          <p className="text-sm text-ink/70">{t("slotCount", { count: result.slots.length })}</p>
          {result.slots.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {result.slots.map((slot) => (
                <li
                  key={slot.startUtc}
                  className="rounded-md border border-kalyna/30 bg-paper px-3 py-1.5 text-sm"
                >
                  {slot.labelLocal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink/70">{t("noSlots")}</p>
          )}
        </div>
      )}
    </form>
  );
}