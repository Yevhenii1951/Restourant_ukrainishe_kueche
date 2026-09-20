"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createReservationRequestAction } from "../requestActions";
import { RESERVATION_PRIVACY_VERSION } from "../request";

export function RequestReservationForm({
  slotStartUtc,
  durationMinutes,
}: {
  slotStartUtc: string;
  durationMinutes: number;
}) {
  const t = useTranslations("reservierung");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function submit(formData: FormData): Promise<void> {
    setBusy(true);
    setMessage(null);
    const payload = {
      guestName: String(formData.get("guestName") ?? ""),
      guestEmail: String(formData.get("guestEmail") ?? ""),
      guestPhone: String(formData.get("guestPhone") ?? ""),
      partySize: Number(formData.get("partySize") ?? 2),
      slotStartUtc,
      seatingPreference: String(formData.get("seatingPreference") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      privacyVersion: RESERVATION_PRIVACY_VERSION,
      privacyAccepted: formData.get("privacyAccepted") === "on",
      idempotencyKey,
    };
    const result = await createReservationRequestAction(payload);
    setBusy(false);
    if (result.status === "created") {
      router.push(`/${locale}/reservierung/${result.token}`);
      return;
    }
    if (result.status === "conflict") {
      setMessage(t("conflict"));
      return;
    }
    setMessage(t(result.reason));
  }

  return (
    <form
      action={async (formData) => {
        await submit(formData);
      }}
      className="space-y-4 rounded-2xl border border-ink/10 bg-paper p-6"
    >
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("contactName")}
          <input
            name="guestName"
            required
            maxLength={80}
            className="w-64 rounded-md border border-ink/15 bg-linen px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("contactEmail")}
          <input
            name="guestEmail"
            type="email"
            required
            maxLength={254}
            className="w-64 rounded-md border border-ink/15 bg-linen px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("contactPhone")}
          <input
            name="guestPhone"
            type="tel"
            required
            minLength={3}
            maxLength={30}
            className="w-48 rounded-md border border-ink/15 bg-linen px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("partyLabel")}
          <select name="partySize" defaultValue={2} className="rounded-md border border-ink/15 bg-linen px-3 py-2">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
            <option value={7}>7</option>
            <option value={8}>8</option>
            <option value={9}>9</option>
            <option value={10}>10</option>
            <option value={11}>11</option>
            <option value={12}>12</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("preferenceLabel")}
          <input
            name="seatingPreference"
            maxLength={120}
            placeholder="z. B. am Fenster"
            className="w-64 rounded-md border border-ink/15 bg-linen px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("notesLabel")}
        <textarea
          name="notes"
          maxLength={500}
          rows={3}
          className="rounded-md border border-ink/15 bg-linen px-3 py-2"
        />
      </label>

      <p className="text-xs text-ink/60">
        {t("selectedSlot")}: {new Date(slotStartUtc).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · {durationMinutes / 60} h
      </p>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="privacyAccepted" required className="mt-1" />
        <span>{t("privacyLabel")}</span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? t("requestSending") : t("submitRequest")}
      </button>

      {message ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </p>
      ) : null}
    </form>
  );
}