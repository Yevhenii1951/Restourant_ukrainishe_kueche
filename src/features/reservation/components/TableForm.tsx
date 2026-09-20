"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveTableAction } from "../staffActions";

export function TableForm({
  table,
}: {
  table?: { id: string; internalLabel: string; capacity: number; area: string; active: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await saveTableAction(formData);
    setBusy(false);
    if (!result.ok) {
      setError("Speichern fehlgeschlagen — prüfen Sie die Eingaben.");
      return;
    }
    router.refresh();
  }

  return (
    <form
      action={async (formData) => {
        await submit(formData);
      }}
      className="mt-3 space-y-3"
    >
      {table ? <input type="hidden" name="id" value={table.id} /> : null}
      <label className="flex flex-col gap-1 text-sm">
        Interne Bezeichnung
        <input
          name="internalLabel"
          required
          maxLength={60}
          defaultValue={table?.internalLabel}
          placeholder="z. B. Fenster 2"
          className="rounded-md border border-ink/15 bg-paper px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sitzplätze
        <input
          name="capacity"
          type="number"
          min={1}
          max={200}
          defaultValue={table?.capacity ?? 2}
          className="w-24 rounded-md border border-ink/15 bg-paper px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bereich
        <input
          name="area"
          required
          maxLength={40}
          defaultValue={table?.area}
          placeholder="z. B. Saal"
          className="w-48 rounded-md border border-ink/15 bg-paper px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {table ? "Speichern" : "Tisch anlegen"}
      </button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  );
}