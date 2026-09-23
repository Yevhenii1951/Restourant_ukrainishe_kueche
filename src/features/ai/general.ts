import { resolveFaq } from "@/features/content/public";
import { getPublicContentEntries } from "@/features/content/service";
import { getPublicMenu } from "@/features/menu/service";
import { generateGroqAnswer, groqAiEnabled, type GroqAiEnv } from "@/features/ai/groq";
import type { AiLocale } from "@/features/ai/tools";

export async function generalGroqAnswer(
  env: GroqAiEnv,
  userMessage: string,
  locale: AiLocale,
): Promise<string | null> {
  if (!groqAiEnabled(env)) return null;
  const menu = await getPublicMenu(locale).catch(() => null);
  const content = await getPublicContentEntries().catch(() => null);
  const faq = content ? resolveFaq(content, locale) : null;
  if (!menu && !faq) return null;
  return generateGroqAnswer({
    env,
    userMessage,
    locale,
    tool: "general",
    data: {
      menu: menu?.items.map((item) => ({
        name: item.name,
        description: item.description,
        priceCents: item.basePriceCents,
      })) ?? [],
      faq: faq?.items.map((entry) => ({
        question: entry.question,
        answer: entry.answer,
      })) ?? [],
    },
  });
}