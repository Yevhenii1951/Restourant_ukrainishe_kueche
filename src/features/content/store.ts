import { z } from "zod";
import { CONTENT_KEY, PUBLICATION_STATES, type ContentKey, type PublicationState } from "./domain";

export const CONTENT_ENTRY_SCHEMA = z
  .object({
    id: z.string().uuid(),
    typed_key: CONTENT_KEY,
    payload: z.unknown(),
    published_payload: z.unknown().nullable(),
    publication_state: z.enum(PUBLICATION_STATES),
    version: z.number().int(),
    published_version: z.number().int().nullable(),
    updated_at: z.string(),
    updated_by: z.string().uuid().nullable(),
    published_at: z.string().nullable(),
  })
  .strict();

export type ContentEntryRow = z.infer<typeof CONTENT_ENTRY_SCHEMA>;

export interface ContentEntry {
  id: string;
  typedKey: ContentKey;
  payload: unknown;
  publishedPayload: unknown | null;
  publicationState: PublicationState;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  updatedBy: string | null;
  publishedAt: string | null;
}

export type WriteOutcome =
  | { ok: true; version: number }
  | { ok: false; reason: "NOT_FOUND" | "CONFLICT" };

export const PUBLIC_CONTENT_ENTRY_SCHEMA = z
  .object({
    id: z.string().uuid(),
    typed_key: CONTENT_KEY,
    payload: z.unknown(),
    published_at: z.string().nullable(),
  })
  .strict();

export type PublicContentEntryRow = z.infer<typeof PUBLIC_CONTENT_ENTRY_SCHEMA>;

export interface ContentWriteInput {
  typedKey: ContentKey;
  version: number;
  payload: unknown;
  updatedBy: string | null;
}

export interface ContentVersionInput {
  typedKey: ContentKey;
  version: number;
  updatedBy: string | null;
}

export interface ContentStore {
  listEntries(): Promise<ContentEntry[]>;
  listPublished(): Promise<PublicContentEntryRow[]>;
  getEntry(typedKey: ContentKey): Promise<ContentEntry | null>;
  save(input: ContentWriteInput): Promise<WriteOutcome>;
  publish(input: ContentVersionInput): Promise<WriteOutcome>;
  archive(input: ContentVersionInput): Promise<WriteOutcome>;
}

export function toContentEntry(row: ContentEntryRow): ContentEntry {
  return {
    id: row.id,
    typedKey: row.typed_key,
    payload: row.payload,
    publishedPayload: row.published_payload,
    publicationState: row.publication_state,
    version: row.version,
    publishedVersion: row.published_version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    publishedAt: row.published_at,
  };
}