import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isContentKey, type ContentKey } from "./domain";
import {
  CONTENT_ENTRY_SCHEMA,
  PUBLIC_CONTENT_ENTRY_SCHEMA,
  toContentEntry,
  type ContentEntry,
  type ContentStore,
  type ContentVersionInput,
  type ContentWriteInput,
  type WriteOutcome,
} from "./store";

const ENTRY_COLUMNS =
  "id, typed_key, payload, published_payload, publication_state, version, published_version, updated_at, updated_by, published_at";

function parseEntryRows(rows: unknown): ContentEntry[] {
  return (rows as Record<string, unknown>[]).map((row) =>
    toContentEntry(CONTENT_ENTRY_SCHEMA.parse(row)),
  );
}

async function existsEntry(db: SupabaseClient, typedKey: string): Promise<boolean> {
  const { data } = await db
    .from("content_entries")
    .select("typed_key")
    .eq("typed_key", typedKey)
    .maybeSingle();
  return data !== null;
}

export function createSupabaseContentStore(db: SupabaseClient): ContentStore {
  return {
    async listEntries(): Promise<ContentEntry[]> {
      const { data, error } = await db
        .from("content_entries")
        .select(ENTRY_COLUMNS)
        .order("typed_key", { ascending: true });
      if (error) throw error;
      return parseEntryRows(data ?? []);
    },

    async listPublished() {
      const { data, error } = await db
        .from("content_entries_public")
        .select("id, typed_key, payload, published_at");
      if (error) throw error;
      return (data ?? []).map((row) => PUBLIC_CONTENT_ENTRY_SCHEMA.parse(row));
    },

    async getEntry(typedKey: ContentKey): Promise<ContentEntry | null> {
      const { data, error } = await db
        .from("content_entries")
        .select(ENTRY_COLUMNS)
        .eq("typed_key", typedKey)
        .maybeSingle();
      if (error) throw error;
      return data ? parseEntryRows([data])[0] : null;
    },

    async save(input: ContentWriteInput): Promise<WriteOutcome> {
      if (!isContentKey(input.typedKey)) return { ok: false, reason: "NOT_FOUND" };
      const { data, error } = await db
        .from("content_entries")
        .update({
          payload: input.payload,
          version: input.version + 1,
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq("typed_key", input.typedKey)
        .eq("version", input.version)
        .select("version")
        .maybeSingle();
      if (error) throw error;
      if (data) return { ok: true, version: data.version };
      return {
        ok: false,
        reason: (await existsEntry(db, input.typedKey)) ? "CONFLICT" : "NOT_FOUND",
      };
    },

    async publish(input: ContentVersionInput): Promise<WriteOutcome> {
      if (!isContentKey(input.typedKey)) return { ok: false, reason: "NOT_FOUND" };
      const entry = await this.getEntry(input.typedKey);
      if (!entry) return { ok: false, reason: "NOT_FOUND" };
      const { data, error } = await db
        .from("content_entries")
        .update({
          published_payload: entry.payload,
          publication_state: "published",
          published_version: input.version,
          published_at: new Date().toISOString(),
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq("typed_key", input.typedKey)
        .eq("version", input.version)
        .select("version")
        .maybeSingle();
      if (error) throw error;
      if (data) return { ok: true, version: data.version };
      return {
        ok: false,
        reason: (await existsEntry(db, input.typedKey)) ? "CONFLICT" : "NOT_FOUND",
      };
    },

    async archive(input: ContentVersionInput): Promise<WriteOutcome> {
      if (!isContentKey(input.typedKey)) return { ok: false, reason: "NOT_FOUND" };
      const { data, error } = await db
        .from("content_entries")
        .update({
          publication_state: "archived",
          published_payload: null,
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq("typed_key", input.typedKey)
        .eq("version", input.version)
        .select("version")
        .maybeSingle();
      if (error) throw error;
      if (data) return { ok: true, version: data.version };
      return {
        ok: false,
        reason: (await existsEntry(db, input.typedKey)) ? "CONFLICT" : "NOT_FOUND",
      };
    },
  };
}