import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_LOCALE_SCHEMA, classifyAiQuestion, executeAiTool } from "@/features/ai/tools";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
  locale: AI_LOCALE_SCHEMA,
}).strict();

const requests = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const PII_PATTERN = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\+?\d[\d\s().-]{7,}\d/;

function allowed(request: Request): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const bucket = requests.get(key);
  if (!bucket || bucket.resetAt <= now) { requests.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS }); return true; }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function toAnswer(tool: string, data: unknown): string {
  if (tool === "searchMenu" && Array.isArray(data)) {
    const names = data.flatMap((item) => typeof item === "object" && item !== null && "name" in item && typeof item.name === "string" ? [item.name] : []);
    return names.length > 0 ? `Aktuell auf der Speisekarte: ${names.join(", ")}.` : "Keine passenden Gerichte gefunden.";
  }
  if (tool === "getOpeningHours" && Array.isArray(data)) return "Die aktuellen Öffnungszeiten findest du im Bereich Kontakt.";
  if (tool === "getDeliveryInfo" && typeof data === "object" && data !== null && "available" in data) return data.available ? "Lieferung ist für diese PLZ verfügbar." : "Für diese PLZ ist aktuell keine Lieferung verfügbar.";
  if (tool === "checkReservationAvailability") return "Die verfügbaren Reservierungszeiten wurden geprüft.";
  if (tool === "searchFaq") return "Passende Antworten findest du im FAQ-Bereich.";
  return "Der Assistent ist gerade nicht verfügbar.";
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!allowed(request)) return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }
  if (PII_PATTERN.test(parsed.data.message)) {
    return NextResponse.json({ error: "pii-not-accepted" }, { status: 400 });
  }
  const message = parsed.data.message.toLocaleLowerCase(parsed.data.locale);
  if (/allerg|allergy|allergie/.test(message)) {
    return NextResponse.json({ answer: "Bitte prüfe die deklarierten Allergene in der Speisekarte. Für schwere Allergien können wir keine Sicherheit garantieren — wende dich bitte direkt an das Restaurant." });
  }
  const call = classifyAiQuestion(message);
  if (!call) return NextResponse.json({ error: "assistant-unavailable" }, { status: 503 });
  const data = await executeAiTool(call.tool, call.input, parsed.data.locale).catch(() => null);
  if (data === null) return NextResponse.json({ error: "assistant-unavailable" }, { status: 503 });
  return NextResponse.json({ answer: toAnswer(call.tool, data), tool: call.tool, data });
}
