"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cancelPublicOrderAction } from "@/features/order/actions";

type CancelReason = "changed_mind" | "wrong_order" | "other";

export default function CancelOrderForm({ token }: Readonly<{ token: string }>) {
  const t = useTranslations("bestellen");
  const router = useRouter();
  const [reason, setReason] = useState<CancelReason>("changed_mind");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    const result = await cancelPublicOrderAction(token, reason);
    setBusy(false);
    if (result.status === "cancelled") {
      router.refresh();
      return;
    }
    setFailed(true);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-ink/10 bg-paper p-5">
      <h2 className="font-display text-xl font-semibold">{t("cancelTitle")}</h2>
      <div className="mt-3">
        <label htmlFor="cancel-reason" className="mb-1 block text-sm font-medium">
          {t("cancelReasonLabel")}
        </label>
        <select
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value as CancelReason)}
          className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2"
        >
          <option value="changed_mind">{t("cancelReasonChangedMind")}</option>
          <option value="wrong_order">{t("cancelReasonWrongOrder")}</option>
          <option value="other">{t("cancelReasonOther")}</option>
        </select>
      </div>
      {failed ? (
        <p role="alert" className="mt-3 text-sm text-amber-800">
          {t("cancelNotPossible")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 w-full rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {busy ? t("cancelling") : t("cancelAction")}
      </button>
    </form>
  );
}