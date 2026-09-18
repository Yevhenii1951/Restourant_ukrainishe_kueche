"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { ContentKey, PublicationState } from "../domain";
import type { EditorField } from "../editorMeta";
import { archiveContentAction, publishContentAction, saveContentAction } from "../contentActions";
import type { ActionResult } from "@/features/identity/staffActions";
import { ContentFieldControls } from "./ContentFieldControls";

type ContentResult = { typedKey: ContentKey; version: number };

interface Props {
  typedKey: ContentKey;
  heading: string;
  fields: EditorField[];
  entryVersion: number;
  publicationState: PublicationState;
  publishedVersion: number | null;
  initialPayload: unknown;
}

type AsyncAction = (
  prevState: ActionResult<ContentResult> | null,
  formData: FormData,
) => Promise<ActionResult<ContentResult>>;

export default function ContentEntryEditor({
  typedKey,
  heading,
  fields,
  entryVersion,
  publicationState,
  publishedVersion,
  initialPayload,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(() =>
    isRecord(initialPayload) ? initialPayload : {},
  );

  const [saveState, saveAction, isSaving] = useActionState(
    makeSaveAction(draft, fields),
    null,
  );
  const [publishState, publishAction, isPublishing] = useActionState(
    makePublishAction(entryVersion),
    null,
  );

  const currentVersion = saveState?.ok
    ? saveState.data.version
    : publishState?.ok
      ? publishState.data.version
      : entryVersion;

  useEffect(() => {
    if (saveState?.ok) router.refresh();
  }, [saveState, router]);

  useEffect(() => {
    if (publishState?.ok) router.refresh();
  }, [publishState, router]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <p className="text-sm text-ink/60">
          Zustand: <Status state={publicationState} /> · Entwurf Version {currentVersion}
          {publishedVersion !== null ? ` · veröffentlichte Version ${publishedVersion}` : ""}
        </p>
      </header>

      <form action={saveAction}>
        <input type="hidden" name="typedKey" value={typedKey} />
        <input type="hidden" name="version" value={currentVersion} />
        <ContentFieldControls
          fields={fields}
          values={draft}
          onChange={(name, value) =>
            setDraft((previous) => ({ ...previous, [name]: value }))
          }
        />
        {saveState && (
          <StatusMessage state={saveState} successText="Entwurf gespeichert." />
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50"
          >
            {isSaving ? "Speichert …" : "Entwurf speichern"}
          </button>
        </div>
      </form>

      <form action={publishAction} className="border-t border-ink/10 pt-6">
        <input type="hidden" name="typedKey" value={typedKey} />
        <input type="hidden" name="version" value={currentVersion} />
        {publishState && (
          <StatusMessage state={publishState} successText="Version veröffentlicht." />
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPublishing}
            className="rounded-md bg-green-800 px-4 py-2 text-sm text-paper disabled:opacity-50"
          >
            {isPublishing ? "Veröffentlicht …" : "Version veröffentlichen"}
          </button>
          <button
            type="button"
            onClick={() => submitArchive(typedKey, currentVersion)}
            className="rounded-md border border-ink/30 px-4 py-2 text-sm text-ink/80"
          >
            Archivieren
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusMessage({
  state,
  successText,
}: {
  state: ActionResult<ContentResult>;
  successText: string;
}) {
  if (state.ok) {
    return <p className="mt-3 text-sm text-green-800">{successText}</p>;
  }
  return (
    <p className="mt-3 text-sm text-red-800">
      {state.code === "FORBIDDEN" && "Keine Berechtigung."}
      {state.code === "CONFLICT" && "Konflikt: Version wurde inzwischen geändert."}
      {state.code === "UNAUTHORIZED" && "Nicht angemeldet."}
      {state.code === "VALIDATION_FAILED" && "Validierung fehlgeschlagen — Felder prüfen."}
      {state.code === "EXTERNAL_FAILURE" && "Externer Fehler."}
    </p>
  );
}

async function submitArchive(typedKey: string, version: number) {
  const formData = new FormData();
  formData.set("typedKey", typedKey);
  formData.set("version", String(version));
  const state = await archiveContentAction(formData);
  if (state.ok) location.reload();
}

function makeSaveAction(draft: Record<string, unknown>, fields: EditorField[]) {
  const action: AsyncAction = async (_previous, formData) => {
    formData.set("payload", JSON.stringify(serializeFields(fields, draft)));
    return saveContentAction(formData);
  };
  return action;
}

function makePublishAction(version: number) {
  const action: AsyncAction = async (_previous, formData) => {
    formData.set("version", String(version));
    return publishContentAction(formData);
  };
  return action;
}

function serializeFields(
  fields: EditorField[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.kind === "localized") {
      const record = isRecord(value) ? value : {};
      const clean = pickTextLocales(record);
      if (clean.de !== "" || clean.en !== "" || clean.uk !== "") result[field.name] = clean;
      continue;
    }
    if (field.kind === "list") {
      if (Array.isArray(value)) {
        const items = value
          .map((item) =>
            isRecord(item) ? serializeFields(field.fields, item) : {},
          )
          .filter((item) => Object.keys(item).length > 0);
        if (items.length > 0) result[field.name] = items;
      }
      continue;
    }
    if (typeof value === "string" && value.trim() !== "") {
      result[field.name] = value.trim();
    }
  }
  return result;
}

function pickTextLocales(
  record: Record<string, unknown>,
): { de: string; en: string; uk: string } {
  return {
    de: typeof record.de === "string" ? record.de.trim() : "",
    en: typeof record.en === "string" ? record.en.trim() : "",
    uk: typeof record.uk === "string" ? record.uk.trim() : "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function Status({ state }: { state: PublicationState }) {
  const label =
    state === "published" ? "veröffentlicht" : state === "archived" ? "archiviert" : "Entwurf";
  return <span>{label}</span>;
}