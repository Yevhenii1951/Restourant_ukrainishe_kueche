import { z } from "zod";
import type { AiLocale, AiToolName } from "./tools";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

const groqResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().min(1) }),
      }),
    )
    .min(1),
});

export interface GroqAiEnv {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  AI_MONTHLY_BUDGET_EUR?: string;
}

export interface GroqAnswerInput {
  env: GroqAiEnv;
  userMessage: string;
  locale: AiLocale;
  tool: AiToolName;
  data: unknown;
  fetcher?: typeof fetch;
}

export function groqAiEnabled(env: GroqAiEnv): boolean {
  return Boolean(env.GROQ_API_KEY && env.AI_MONTHLY_BUDGET_EUR);
}

function localeName(locale: AiLocale): string {
  if (locale === "en") return "English";
  if (locale === "uk") return "Ukrainian";
  return "German";
}

function compactToolData(data: unknown): string {
  return JSON.stringify(data).slice(0, 4000);
}

export async function generateGroqAnswer({
  env,
  userMessage,
  locale,
  tool,
  data,
  fetcher = fetch,
}: GroqAnswerInput): Promise<string | null> {
  if (!groqAiEnabled(env)) return null;
  const response = await fetcher(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GROQ_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
      temperature: 0.25,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You are the read-only assistant for the fictional demo restaurant Kalyna in Kassel. Answer only from the provided tool result. Do not create orders, reservations, legal advice, medical advice, or allergy safety guarantees. If the tool result is insufficient, say what page or staff contact the guest should use.",
        },
        {
          role: "user",
          content: `Answer in ${localeName(locale)}.
Tool: ${tool}
Guest question: ${userMessage}
Tool result JSON: ${compactToolData(data)}`,
        },
      ],
    }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  const parsed = groqResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.choices[0].message.content.trim() : null;
}
