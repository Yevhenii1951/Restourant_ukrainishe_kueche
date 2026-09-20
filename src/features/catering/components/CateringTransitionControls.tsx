"use client";
import { useState } from "react";
import { transitionCateringInquiryAction } from "../staffActions";
const next: Record<string, string[]> = { new: ["contacted", "cancelled"], contacted: ["quoted", "cancelled"], quoted: ["confirmed", "cancelled"] };
export function CateringTransitionControls({ id, version, state }: { id: string; version: number; state: string }): React.ReactElement | null {
  const [busy, setBusy] = useState(false); const options = next[state] ?? [];
  if (!options.length) return null;
  async function transition(targetState: string): Promise<void> { setBusy(true); await transitionCateringInquiryAction({ inquiryId: id, expectedVersion: version, targetState }); setBusy(false); }
  return <div className="flex flex-wrap gap-2">{options.map((target) => <button key={target} disabled={busy} onClick={() => transition(target)} className="rounded-md border border-ink/20 px-3 py-1 text-sm capitalize disabled:opacity-50">{target}</button>)}</div>;
}
