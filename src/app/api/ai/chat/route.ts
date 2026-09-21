import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicMenu } from "@/features/menu/service";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
  locale: z.enum(["de", "en", "uk"]),
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
  if (/menu|karte|gericht|dish|страв/.test(message)) {
    const menu = await getPublicMenu(parsed.data.locale);
    const names = menu.items.slice(0, 5).map((item) => item.name).join(", ");
    return NextResponse.json({ answer: names ? `Aktuell auf der Speisekarte: ${names}.` : "Die Speisekarte ist gerade nicht verfügbar." });
  }
  return NextResponse.json({ error: "assistant-unavailable" }, { status: 503 });
}
