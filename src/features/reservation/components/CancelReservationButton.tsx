"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cancelPublicReservationAction } from "../requestActions";

export default function CancelReservationButton({ token }: Readonly<{ token: string }>) {
  const t = useTranslations("reservierung");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  async function cancel(): Promise<void> {
    setBusy(true);
    setFailed(false);
    const result = await cancelPublicReservationAction(token);
    setBusy(false);
    if (result.status === "cancelled") {
      setDone(true);
      router.refresh();
      return;
    }
    setFailed(true);
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
        {t("cancelDone")}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <h2 className="font-display text-xl font-semibold">{t("statusTitle")}</h2>
      <p className="mt-2 text-sm text-ink/70">{t("statusCutoff")}</p>
      {failed ? (
        <p role="alert" className="mt-3 text-sm text-amber-800">
          {t("cancelCutoff")}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void cancel()}
        disabled={busy}
        className="mt-3 w-full rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {busy ? t("cancelSending") : t("cancelButton")}
      </button>
    </div>
  );
}