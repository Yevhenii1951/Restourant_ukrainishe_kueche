"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RESERVATION_TRANSITIONS, type ReservationState } from "../states";
import { transitionReservationAction } from "../staffActions";
import { RESERVATION_STATUS_LABELS } from "./statusLabels";

export function ReservationTransitionControls({
  reservationId,
  expectedVersion,
  status,
}: {
  reservationId: string;
  expectedVersion: number;
  status: ReservationState;
}) {
  const router = useRouter();
  const targets = RESERVATION_TRANSITIONS[status];
  const [target, setTarget] = useState<ReservationState>(targets[0]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (targets.length === 0) {
    return <p className="text-sm text-ink/60">Endstatus — keine weiteren Aktionen.</p>;
  }

  const needsReason = target === "declined" || target === "cancelled" || target === "no_show";

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await transitionReservationAction({
      reservationId,
      expectedVersion,
      targetStatus: target,
      reason: needsReason ? reason : null,
    });
    setBusy(false);
    if (!result.ok) {
      if (result.code === "CONFLICT") setError("Inzwischen geändert — Seite neu laden.");
      else if (result.code === "NO_TABLE_AVAILABLE") setError("Kein Tisch mehr verfügbar — Anfrage ablehnen oder neuen Termin klären.");
      else if (result.code === "INVALID_STATE_TRANSITION") setError("Dieser Schritt ist aus dem aktuellen Status nicht erlaubt.");
      else if (result.code === "VALIDATION_FAILED") setError("Bitte die Pflichtfelder ausfüllen.");
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
      <select
        value={target}
        onChange={(event) => setTarget(event.target.value as ReservationState)}
        className="rounded border border-ink/25 bg-paper px-3 py-2 text-sm"
        aria-label="Zielstatus"
      >
        {targets.map((next) => (
          <option key={next} value={next}>
            {RESERVATION_STATUS_LABELS[next]}
          </option>
        ))}
      </select>
      {needsReason ? (
        <label className="block text-sm">
          Grund (Pflichtfeld)
          <input
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
        className="rounded bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50"
      >
        {busy ? "…" : RESERVATION_STATUS_LABELS[target]}
      </button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  );
}
