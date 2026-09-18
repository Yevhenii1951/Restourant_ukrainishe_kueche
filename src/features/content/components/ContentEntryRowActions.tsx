"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { ContentKey } from "../domain";
import type { ActionResult } from "@/features/identity/staffActions";
import { archiveContentAction, publishContentAction } from "../contentActions";

type Result = { typedKey: ContentKey; version: number };

type AsyncAction = (
  prevState: ActionResult<Result> | null,
  formData: FormData,
) => Promise<ActionResult<Result>>;

export function ContentEntryRowActions({
  typedKey,
  version,
  publicationState,
}: {
  typedKey: ContentKey;
  version: number;
  publicationState: string;
}) {
  const router = useRouter();
  const [publishState, publishAction, isPublishing] = useActionState(
    wrap(publishContentAction, version),
    null,
  );
  const [archiveState, archiveAction, isArchiving] = useActionState(
    wrap(archiveContentAction, version),
    null,
  );

  useEffect(() => {
    if (publishState?.ok || archiveState?.ok) router.refresh();
  }, [publishState, archiveState, router]);

  return (
    <div className="flex items-center gap-2">
      <form action={publishAction}>
        <input type="hidden" name="typedKey" value={typedKey} />
        <input type="hidden" name="version" value={version} />
        <button
          type="submit"
          disabled={isPublishing || publicationState === "published"}
          className="rounded border border-ink/25 px-3 py-1 text-sm disabled:opacity-50"
        >
          {publicationState === "published" ? "veröffentlicht" : "Veröffentlichen"}
        </button>
      </form>
      <form action={archiveAction}>
        <input type="hidden" name="typedKey" value={typedKey} />
        <input type="hidden" name="version" value={version} />
        <button
          type="submit"
          disabled={isArchiving || publicationState === "archived"}
          className="rounded border border-ink/25 px-3 py-1 text-sm disabled:opacity-50"
        >
          {publicationState === "archived" ? "archiviert" : "Archivieren"}
        </button>
      </form>
      {(publishState && !publishState.ok) || (archiveState && !archiveState.ok) ? (
        <span className="text-sm text-red-800">Konflikt — Seite neu laden.</span>
      ) : null}
    </div>
  );
}

function wrap(
  action: (formData: FormData) => Promise<ActionResult<Result>>,
  version: number,
): AsyncAction {
  return async (_previous, formData) => {
    formData.set("version", String(version));
    return action(formData);
  };
}