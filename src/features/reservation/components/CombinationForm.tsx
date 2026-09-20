"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCombinationAction } from "../staffActions";
import type { ReservationTableRow } from "../store";

export function CombinationForm({
  tables,
  combination,
}: {
  tables: ReservationTableRow[];
  combination?: { id: string; name: string; active: boolean; memberTableIds: string[] };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = new Set(combination?.memberTableIds ?? []);

  async function submit(formData: FormData): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await saveCombinationAction(formData);
    setBusy(false);
    if (!result.ok) {
      setError("Speichern fehlgeschlagen — mindestens zwei verschiedene Tische wählen.");
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
      {combination ? <input type="hidden" name="id" value={combination.id} /> : null}
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={combination?.name}
          placeholder="z. B. Saal Fenster"
          className="w-64 rounded-md border border-ink/15 bg-paper px-3 py-2"
        />
      </label>
      <fieldset className="flex flex-wrap gap-3 text-sm">
        <legend className="mb-1">Tische (mindestens zwei auswählen)</legend>
        {tables.map((table) => (
          <label key={table.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="memberTableIds"
              value={table.id}
              defaultChecked={selected.has(table.id)}
            />
            {table.internalLabel} ({table.capacity})
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {combination ? "Speichern" : "Kombination anlegen"}
      </button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  );
}