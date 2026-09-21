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

type ContentEntryDbRow = {
  id: string;
  typed_key: string;
  payload: unknown;
  published_payload: unknown;
  publication_state: string;
  version: number;
  published_version: number;
  updated_at: string;
  updated_by: string;
  published_at: string;
};

const ENTRY_COLUMNS = `id, typed_key, payload, published_payload, publication_state,
  version, published_version, updated_at, updated_by, published_at`;

function parseEntryRow(row: ContentEntryDbRow): ContentEntry {
  return toContentEntry(CONTENT_ENTRY_SCHEMA.parse(row));
}

type Queryable = { query<T>(query: string, values?: unknown[]): Promise<{ rows: T[] }> };

async function existsEntry(db: Queryable, typedKey: ContentKey): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM content_entries WHERE typed_key = $1) AS exists",
    [typedKey],
  );
  return result.rows[0].exists;
}

export function createPostgresContentStore(db: Queryable): ContentStore {
  return {
    async listEntries(): Promise<ContentEntry[]> {
      const result = await db.query<ContentEntryDbRow>(
        `SELECT ${ENTRY_COLUMNS} FROM content_entries ORDER BY typed_key`,
      );
      return result.rows.map(parseEntryRow);
    },

    async listPublished() {
      const result = await db.query<Record<string, unknown>>(
        "SELECT id, typed_key, payload, published_at FROM content_entries_public",
      );
      return result.rows.map((row) => PUBLIC_CONTENT_ENTRY_SCHEMA.parse(row));
    },

    async getEntry(typedKey: ContentKey): Promise<ContentEntry | null> {
      const result = await db.query<ContentEntryDbRow>(
        `SELECT ${ENTRY_COLUMNS} FROM content_entries WHERE typed_key = $1`,
        [typedKey],
      );
      return result.rows[0] ? parseEntryRow(result.rows[0]) : null;
    },

    async save(input: ContentWriteInput): Promise<WriteOutcome> {
      if (!isContentKey(input.typedKey)) return { ok: false, reason: "NOT_FOUND" };
      const result = await db.query<{ version: number }>(
        `UPDATE content_entries
         SET payload = $2::jsonb, version = version + 1, updated_by = $3, updated_at = now()
         WHERE typed_key = $1 AND version = $4
         RETURNING version`,
        [input.typedKey, JSON.stringify(input.payload), input.updatedBy, input.version],
      );
      if (result.rows[0]) return { ok: true, version: result.rows[0].version };
      const entry = await existsEntry(db, input.typedKey);
      return { ok: false, reason: entry ? "CONFLICT" : "NOT_FOUND" };
    },

    async publish(input: ContentVersionInput): Promise<WriteOutcome> {
      if (!isContentKey(input.typedKey)) return { ok: false, reason: "NOT_FOUND" };
      const entry = await this.getEntry(input.typedKey);
      if (!entry) return { ok: false, reason: "NOT_FOUND" };
      const result = await db.query<{ version: number }>(
        `UPDATE content_entries
         SET published_payload = $2::jsonb, publication_state = 'published',
             published_version = version, published_at = now(), updated_by = $3, updated_at = now()
         WHERE typed_key = $1 AND version = $4
         RETURNING version`,
        [input.typedKey, JSON.stringify(entry.payload), input.updatedBy, input.version],
      );
      if (result.rows[0]) return { ok: true, version: result.rows[0].version };
      return { ok: false, reason: (await existsEntry(db, input.typedKey)) ? "CONFLICT" : "NOT_FOUND" };
    },

    async archive(input: ContentVersionInput): Promise<WriteOutcome> {
      if (!isContentKey(input.typedKey)) return { ok: false, reason: "NOT_FOUND" };
      const result = await db.query<{ version: number }>(
        `UPDATE content_entries
         SET publication_state = 'archived', published_payload = NULL,
             updated_by = $3, updated_at = now()
         WHERE typed_key = $1 AND version = $2
         RETURNING version`,
        [input.typedKey, input.version, input.updatedBy],
      );
      if (result.rows[0]) return { ok: true, version: result.rows[0].version };
      return { ok: false, reason: (await existsEntry(db, input.typedKey)) ? "CONFLICT" : "NOT_FOUND" };
    },
  };
}
