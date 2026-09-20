"use client";

import { useState } from "react";
import { exportOrdersCsvAction } from "../staffActions";

export function ExportCsvButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await exportOrdersCsvAction();
    setBusy(false);
    if (!result.ok) {
      setError(result.code === "FORBIDDEN" ? "Nicht erlaubt." : "Export fehlgeschlagen.");
      return;
    }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kalyna-bestellungen-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={exportCsv}
        disabled={busy}
        className="rounded border border-ink/25 px-4 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "…" : "CSV exportieren"}
      </button>
      {error ? <span className="text-sm text-red-800">{error}</span> : null}
    </div>
  );
}