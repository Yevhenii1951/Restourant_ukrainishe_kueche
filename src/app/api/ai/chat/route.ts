import { NextResponse } from "next/server";
import { z } from "zod";
import {
  aiSessionCookieHeader,
  appendAiExchange,
  newAiSessionId,
  parseAiSessionCookie,
  paidAiCallsEnabled,
} from "@/features/ai/history";
import {
  AI_LOCALE_SCHEMA,
  classifyAiQuestion,
  executeAiTool,
} from "@/features/ai/tools";
import { generateGroqAnswer } from "@/features/ai/groq";
import { getServerPool } from "@/lib/db/serverPool";
import { serverEnv } from "@/lib/env/server";

const requestSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    locale: AI_LOCALE_SCHEMA,
  })
  .strict();

const requests = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const PII_PATTERN = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\+?\d[\d\s().-]{7,}\d/;

function allowed(request: Request, sessionId: string): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${sessionId}`;
  const now = Date.now();
  const bucket = requests.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function toAnswer(tool: string, data: unknown): string {
  if (tool === "searchMenu" && Array.isArray(data)) {
    const names = data.flatMap((item) =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      typeof item.name === "string"
        ? [item.name]
        : [],
    );
    return names.length > 0
      ? `Aktuell auf der Speisekarte: ${names.join(", ")}.`
      : "Keine passenden Gerichte gefunden.";
  }
  if (tool === "getOpeningHours" && Array.isArray(data))
    return "Die aktuellen Öffnungszeiten findest du im Bereich Kontakt.";
  if (
    tool === "getDeliveryInfo" &&
    typeof data === "object" &&
    data !== null &&
    "available" in data
  ) {
    return data.available
      ? "Lieferung ist für diese PLZ verfügbar."
      : "Für diese PLZ ist aktuell keine Lieferung verfügbar.";
  }
  if (tool === "checkReservationAvailability")
    return "Die verfügbaren Reservierungszeiten wurden geprüft.";
  if (tool === "searchFaq")
    return "Passende Antworten findest du im FAQ-Bereich.";
  return "Der Assistent ist gerade nicht verfügbar.";
}

function jsonWithSession(
  body: unknown,
  status: number,
  sessionId: string,
): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("set-cookie", aiSessionCookieHeader(sessionId));
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  const sessionId =
    parseAiSessionCookie(request.headers.get("cookie")) ?? newAiSessionId();
  if (!allowed(request, sessionId))
    return jsonWithSession({ error: "rate-limited" }, 429, sessionId);

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return jsonWithSession({ error: "invalid-request" }, 400, sessionId);
  if (PII_PATTERN.test(parsed.data.message))
    return jsonWithSession({ error: "pii-not-accepted" }, 400, sessionId);

  const message = parsed.data.message.toLocaleLowerCase(parsed.data.locale);
  if (/allerg|allergy|allergie/.test(message)) {
    const answer =
      "Bitte prüfe die deklarierten Allergene in der Speisekarte. Für schwere Allergien können wir keine Sicherheit garantieren - wende dich bitte direkt an das Restaurant.";
    await appendAiExchange(
      getServerPool(),
      sessionId,
      parsed.data.message,
      answer,
      undefined,
      parsed.data.locale,
    );
    return jsonWithSession({ answer }, 200, sessionId);
  }

  const call = classifyAiQuestion(message);
  if (!call) {
    const answer =
      "Ich kann Fragen zur Speisekarte, zu Öffnungszeiten, Lieferung, Reservierungszeiten und FAQ beantworten. Für Bestellungen oder persönliche Anliegen nutze bitte Speisekarte oder Kontakt.";
    await appendAiExchange(
      getServerPool(),
      sessionId,
      parsed.data.message,
      answer,
      undefined,
      parsed.data.locale,
    );
    return jsonWithSession({ answer }, 200, sessionId);
  }
  if (serverEnv.AI_PROVIDER_KEY && !paidAiCallsEnabled(serverEnv)) {
    return jsonWithSession({ error: "assistant-unavailable" }, 503, sessionId);
  }

  const data = await executeAiTool(
    call.tool,
    call.input,
    parsed.data.locale,
  ).catch(() => null);
  if (data === null)
    return jsonWithSession({ error: "assistant-unavailable" }, 503, sessionId);
  const answer =
    (await generateGroqAnswer({
      env: serverEnv,
      userMessage: parsed.data.message,
      locale: parsed.data.locale,
      tool: call.tool,
      data,
    })) ?? toAnswer(call.tool, data);
  await appendAiExchange(
    getServerPool(),
    sessionId,
    parsed.data.message,
    answer,
    undefined,
    parsed.data.locale,
  );
  return jsonWithSession({ answer, tool: call.tool, data }, 200, sessionId);
}
