"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_TRANSITIONS, type OrderState } from "../transitions";
import { transitionOrderAction } from "../staffActions";

const TARGET_LABELS: Partial<Record<OrderState, string>> = {
  accepted: "Bestätigen",
  rejected: "Ablehnen",
  preparing: "In Zubereitung",
  ready: "Fertig melden",
  completed: "Abholen",
  cancelled: "Stornieren",
};

export function OrderTransitionControls({
  orderId,
  expectedVersion,
  state,
}: {
  orderId: string;
  expectedVersion: number;
  state: OrderState;
}) {
  const router = useRouter();
  const targets = ORDER_TRANSITIONS[state];
  const [target, setTarget] = useState<OrderState>(targets[0]);
  const [reason, setReason] = useState("");
  const [estimate, setEstimate] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (targets.length === 0) {
    return (
      <p className="text-sm text-ink/60">Endstatus — keine weiteren Aktionen.</p>
    );
  }
  const needsReason = target === "cancelled" || target === "rejected";
  const needsEstimate = target === "accepted";

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await transitionOrderAction({
      orderId,
      expectedVersion,
      targetState: target,
      reason: needsReason ? reason : null,
      estimateMinutes: needsEstimate ? estimate : null,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.code === "CONFLICT")
        setError("Inzwischen geändert — Seite neu laden.");
      else if (result.code === "INVALID_STATE_TRANSITION")
        setError("Dieser Schritt ist aus dem aktuellen Status nicht erlaubt.");
      else if (result.code === "VALIDATION_FAILED")
        setError("Bitte die Pflichtfelder ausfüllen.");
      else setError("Aktion fehlgeschlagen — erneut versuchen.");
      if (result.code === "CONFLICT") router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-3 rounded-md border border-ink/10 bg-linen p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value as OrderState)}
          className="rounded border border-ink/25 bg-paper px-3 py-2 text-sm"
          aria-label="Zielstatus"
        >
          {targets.map((next) => (
            <option key={next} value={next}>
              {TARGET_LABELS[next] ?? next}
            </option>
          ))}
        </select>
        {needsEstimate ? (
          <label className="text-sm">
            Fertig in Minuten
            <input
              type="number"
              min={1}
              max={240}
              required
              value={estimate}
              onChange={(event) => setEstimate(Number(event.target.value))}
              className="ml-2 w-24 rounded border border-ink/25 bg-paper px-2 py-2 text-sm"
            />
          </label>
        ) : null}
      </div>
      {needsReason ? (
        <label className="block text-sm">
          Grund (Pflichtfeld)
          <input
            type="text"
            required
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded border border-ink/25 bg-paper px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className={
          target === "cancelled" || target === "rejected"
            ? "rounded bg-red-800 px-4 py-2 text-sm text-white disabled:opacity-50"
            : "rounded bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50"
        }
      >
        {busy ? "…" : TARGET_LABELS[target] ?? "Bestätigen"}
      </button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  );
}