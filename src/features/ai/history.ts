import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const AI_HISTORY_TTL_MS = 5 * 24 * 60 * 60 * 1000;
export const AI_MESSAGE_CAP = 30;
export const AI_SESSION_COOKIE = "kalyna_ai_session";

export interface AiHistoryDb {
  query<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

export type AiHistoryLocale = "de" | "en" | "uk";

export interface AiCostEnv {
  AI_PROVIDER_KEY?: string;
  AI_MONTHLY_BUDGET_EUR?: string;
}

export function newAiSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAiSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function paidAiCallsEnabled(env: AiCostEnv): boolean {
  return Boolean(env.AI_PROVIDER_KEY && env.AI_MONTHLY_BUDGET_EUR);
}

export function parseAiSessionCookie(
  cookieHeader: string | null,
): string | null {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AI_SESSION_COOKIE}=`));
  const value = cookie?.slice(AI_SESSION_COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{32,}$/.test(value) ? value : null;
}

export function aiSessionCookieHeader(
  sessionId: string,
  now = new Date(),
): string {
  const expires = new Date(now.getTime() + AI_HISTORY_TTL_MS).toUTCString();
  return `${AI_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AI_HISTORY_TTL_MS / 1000}; Expires=${expires}`;
}

export async function appendAiMessage(
  db: AiHistoryDb,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  now = new Date(),
  locale: AiHistoryLocale = "de",
): Promise<void> {
  const conversation = await db.query<{ id: string }>(
    `INSERT INTO ai_conversations (session_hash, locale, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (session_hash) DO UPDATE SET locale = EXCLUDED.locale, expires_at = EXCLUDED.expires_at, updated_at = now() RETURNING id`,
    [
      hashAiSessionId(sessionId),
      locale,
      new Date(now.getTime() + AI_HISTORY_TTL_MS),
    ],
  );
  const conversationId = conversation.rows[0]?.id;
  if (!conversationId) throw new Error("ai-conversation-unavailable");
  const tokenCount = Math.ceil(content.length / 4);
  await db.query(
    "INSERT INTO ai_messages (conversation_id, role, content, token_count) VALUES ($1, $2, $3, $4)",
    [conversationId, role, content, tokenCount],
  );
  await db.query(
    `DELETE FROM ai_messages WHERE conversation_id = $1 AND id IN (SELECT id FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC OFFSET $2)`,
    [conversationId, AI_MESSAGE_CAP],
  );
}

export async function appendAiExchange(
  db: AiHistoryDb | null,
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  now = new Date(),
  locale: AiHistoryLocale = "de",
): Promise<void> {
  if (!db) return;
  await appendAiMessage(db, sessionId, "user", userMessage, now, locale);
  await appendAiMessage(
    db,
    sessionId,
    "assistant",
    assistantMessage,
    now,
    locale,
  );
}

export async function deleteExpiredAiConversations(
  db: AiHistoryDb,
  now = new Date(),
): Promise<number> {
  const result = await db.query(
    "DELETE FROM ai_conversations WHERE expires_at <= $1",
    [now],
  );
  return result.rowCount ?? 0;
}
