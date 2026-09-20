"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPickupAcceptingAction } from "../staffActions";

export function AvailabilityToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await setPickupAcceptingAction(!enabled);
    setBusy(false);
    if (!result.ok) {
      setError("Konflikt — Seite neu laden.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-md border border-ink/10 bg-linen p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Vorbestellungen</p>
          <p className="text-sm text-ink/70">
            {enabled
              ? "Die Annahme von Bestellungen ist aktiv."
              : "Die Annahme von Bestellungen ist pausiert."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={
            enabled
              ? "rounded border border-ink/25 px-4 py-2 text-sm disabled:opacity-50"
              : "rounded bg-red-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          }
        >
          {busy ? "…" : enabled ? "Pausieren" : "Wieder öffnen"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}