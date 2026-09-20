"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCombinationActiveAction } from "../staffActions";

export function CombinationRowToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle(): Promise<void> {
    setBusy(true);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("active", active ? "off" : "on");
    await setCombinationActiveAction(formData);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="rounded-md border border-ink/15 px-3 py-1.5 text-sm hover:bg-ink/5 disabled:opacity-50"
    >
      {active ? "Deaktivieren" : "Aktivieren"}
    </button>
  );
}