import type { ContentKey } from "./domain";

export type EditorField =
  | { kind: "localized"; name: string; label: string; textarea?: boolean }
  | { kind: "text"; name: string; label: string; textarea?: boolean }
  | { kind: "date"; name: string; label: string }
  | { kind: "list"; name: string; label: string; fields: EditorField[] };

export const CONTENT_EDITOR_FIELDS: Record<ContentKey, EditorField[]> = {
  home: [
    { kind: "localized", name: "hero", label: "Hero", textarea: true },
    { kind: "localized", name: "storyTeaser", label: "Story-Teaser", textarea: true },
  ],
  about: [
    { kind: "localized", name: "intro", label: "Einleitung" },
    { kind: "localized", name: "story", label: "Geschichte", textarea: true },
  ],
  catering: [
    { kind: "localized", name: "intro", label: "Einführung", textarea: true },
    { kind: "localized", name: "constraints", label: "Rahmenbedingungen", textarea: true },
    { kind: "localized", name: "responseNote", label: "Antwort-Hinweis", textarea: true },
  ],
  lunch: [
    { kind: "localized", name: "intro", label: "Einführung", textarea: true },
    { kind: "date", name: "validFrom", label: "Gültig ab" },
    { kind: "date", name: "validUntil", label: "Gültig bis" },
  ],
  faq: [
    {
      kind: "list",
      name: "items",
      label: "FAQ-Einträge",
      fields: [
        { kind: "localized", name: "question", label: "Frage", textarea: true },
        { kind: "localized", name: "answer", label: "Antwort", textarea: true },
        { kind: "text", name: "category", label: "Kategorie" },
      ],
    },
  ],
  events: [
    {
      kind: "list",
      name: "items",
      label: "Veranstaltungen",
      fields: [
        { kind: "localized", name: "title", label: "Titel", textarea: true },
        { kind: "localized", name: "summary", label: "Zusammenfassung", textarea: true },
        { kind: "date", name: "startsAt", label: "Beginn" },
        { kind: "date", name: "endsAt", label: "Ende" },
      ],
    },
  ],
  gallery: [
    {
      kind: "list",
      name: "items",
      label: "Bilder",
      fields: [
        { kind: "text", name: "storagePath", label: "Dateipfad" },
        { kind: "localized", name: "alt", label: "Alt-Text" },
      ],
    },
  ],
};