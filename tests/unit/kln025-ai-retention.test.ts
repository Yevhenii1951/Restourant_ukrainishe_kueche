import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AI_HISTORY_TTL_MS,
  AI_MESSAGE_CAP,
  AI_SESSION_COOKIE,
  aiSessionCookieHeader,
  appendAiExchange,
  appendAiMessage,
  deleteExpiredAiConversations,
  hashAiSessionId,
  paidAiCallsEnabled,
  parseAiSessionCookie,
  type AiHistoryDb,
} from "@/features/ai/history";
import { parseServerEnv } from "@/lib/env/schemas";

class FakeAiDb implements AiHistoryDb {
  queries: Array<{ sql: string; params: unknown[] }> = [];

  async query<T = unknown>(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    this.queries.push({ sql, params });
    if (sql.includes("RETURNING id"))
      return { rows: [{ id: "conversation-1" }] as T[], rowCount: 1 };
    if (sql.startsWith("DELETE FROM ai_conversations"))
      return { rows: [], rowCount: 2 };
    return { rows: [], rowCount: 1 };
  }
}

describe("KLN-025 AI retention and cost limits", () => {
  it("stores only an opaque session hash and refreshes five-day expiry", async () => {
    const db = new FakeAiDb();
    const now = new Date("2026-09-21T10:00:00.000Z");

    await appendAiMessage(db, "session-secret", "user", "Speisekarte?", now);

    expect(db.queries[0]?.params[0]).toBe(hashAiSessionId("session-secret"));
    expect(db.queries[0]?.params[0]).not.toBe("session-secret");
    expect(db.queries[0]?.params[1]).toBe("de");
    expect(db.queries[0]?.params[2]).toEqual(
      new Date(now.getTime() + AI_HISTORY_TTL_MS),
    );
  });

  it("keeps the newest thirty retained messages", async () => {
    const db = new FakeAiDb();

    await appendAiMessage(db, "session-secret", "assistant", "Antwort");

    const capQuery = db.queries.find((query) =>
      query.sql.includes("OFFSET $2"),
    );
    expect(capQuery?.params).toEqual(["conversation-1", AI_MESSAGE_CAP]);
  });

  it("appends a user/assistant exchange and deletes expired conversations", async () => {
    const db = new FakeAiDb();
    const now = new Date("2026-09-21T12:00:00.000Z");

    await appendAiExchange(db, "session-secret", "Hallo", "Antwort", now);
    await expect(deleteExpiredAiConversations(db, now)).resolves.toBe(2);

    const messageQueries = db.queries.filter((query) =>
      query.sql.startsWith("INSERT INTO ai_messages"),
    );
    expect(messageQueries.map((query) => query.params[1])).toEqual([
      "user",
      "assistant",
    ]);
    expect(messageQueries.map((query) => query.params[3])).toEqual([2, 2]);
  });

  it("uses an http-only opaque cookie with five-day lifetime", () => {
    const header = aiSessionCookieHeader(
      "opaque-session-id",
      new Date("2026-09-21T00:00:00.000Z"),
    );

    expect(header).toContain(`${AI_SESSION_COOKIE}=opaque-session-id`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(
      parseAiSessionCookie(
        `x=1; ${AI_SESSION_COOKIE}=opaque-session-id_12345678901234567890`,
      ),
    ).toBe("opaque-session-id_12345678901234567890");
    expect(parseAiSessionCookie(`${AI_SESSION_COOKIE}=short`)).toBeNull();
  });

  it("fails closed for paid provider calls without an explicit monthly budget", () => {
    expect(paidAiCallsEnabled({ AI_PROVIDER_KEY: "configured" })).toBe(false);
    expect(
      paidAiCallsEnabled({
        AI_PROVIDER_KEY: "configured",
        AI_MONTHLY_BUDGET_EUR: "10.00",
      }),
    ).toBe(true);
    expect(() => parseServerEnv({ AI_MONTHLY_BUDGET_EUR: "ten" })).toThrow();
  });
});
