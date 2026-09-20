"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestFullRefundAction } from "../refundActions";

export function RefundControls({ orderId }: { orderId: string }): React.ReactNode {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setBusy(true);
    setMessage(null);
    const result = await requestFullRefundAction({ orderId, reason });
    setBusy(false);
    if (result.ok) {
      setMessage("Rückerstattung wurde bei Stripe angefordert.");
      router.refresh();
      return;
    }
    setMessage(
      result.code === "NOT_REFUNDABLE"
        ? "Für diese Bestellung ist keine vollständige Rückerstattung möglich."
        : "Rückerstattung fehlgeschlagen. Bitte erneut versuchen.",
    );
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
      <h2 className="font-display text-xl font-semibold text-red-900">Vollständig erstatten</h2>
      <label className="block text-sm text-red-950">
        Grund (Pflichtfeld)
        <input required maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded border border-red-300 bg-paper px-3 py-2 text-sm" />
      </label>
      <button type="submit" disabled={busy} className="rounded bg-red-800 px-4 py-2 text-sm text-white disabled:opacity-50">
        {busy ? "…" : "Stripe-Rückerstattung starten"}
      </button>
      {message ? <p className="text-sm text-red-900">{message}</p> : null}
    </form>
  );
}
