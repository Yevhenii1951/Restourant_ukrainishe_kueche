"use client";

import type { EditorField } from "../editorMeta";

interface Props {
  fields: EditorField[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

export function ContentFieldControls({ fields, values, onChange }: Props) {
  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <FieldControl
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => onChange(field.name, value)}
        />
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === "list") {
    return <ListControl field={field} value={value} onChange={onChange} />;
  }
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink/80">{field.label}</span>
      {field.kind === "localized" ? (
        <LocalizedControl
          field={field}
          value={value}
          onChange={onChange}
        />
      ) : (
        <ScalarControl field={field} value={value} onChange={onChange} />
      )}
    </label>
  );
}

function LocalizedControl({
  field,
  value,
  onChange,
}: {
  field: Extract<EditorField, { kind: "localized" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const record = isRecord(value) ? value : {};
  const setLocale = (locale: string, text: string) => {
    onChange({ ...record, [locale]: text });
  };
  return (
    <div className="space-y-2">
      {(["de", "en", "uk"] as const).map((locale) => (
        <input
          key={locale}
          type="text"
          defaultValue={typeof record[locale] === "string" ? record[locale] : ""}
          onBlur={(event) => setLocale(locale, event.currentTarget.value)}
          className={`w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm ${field.textarea ? "min-h-20" : ""}`}
          lang={locale}
          aria-label={`${field.label} (${locale})`}
        />
      ))}
    </div>
  );
}

function ScalarControl({
  field,
  value,
  onChange,
}: {
  field: Extract<EditorField, { kind: "text" | "date" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const current = typeof value === "string" ? value : "";
  return (
    <input
      type={field.kind === "date" ? "date" : "text"}
      defaultValue={current}
      onBlur={(event) => onChange(event.currentTarget.value)}
      className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
      aria-label={field.label}
    />
  );
}

function ListControl({
  field,
  value,
  onChange,
}: {
  field: Extract<EditorField, { kind: "list" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const updateItem = (index: number, name: string, itemValue: unknown) => {
    const next = items.map((item, i) => (i === index ? { ...item, [name]: itemValue } : item));
    onChange(next);
  };
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    onChange([...items, {}]);
  };
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-ink/80">{field.label}</legend>
      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-ink/15 bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ink/60">
              {field.label} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="rounded border border-ink/20 px-2 py-1 text-xs text-ink/70"
            >
              Entfernen
            </button>
          </div>
          <ContentFieldControls
            fields={field.fields}
            values={item}
            onChange={(name, itemValue) => updateItem(index, name, itemValue)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="rounded border border-ink/30 px-3 py-1 text-sm text-ink/80"
      >
        Eintrag hinzufügen
      </button>
    </fieldset>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}