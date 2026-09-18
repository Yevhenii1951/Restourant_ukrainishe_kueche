import { z } from "zod";
import type { LocalizedText, SupportedLocale } from "@/features/menu/domain";

export const CONTENT_KEYS = [
  "home",
  "about",
  "faq",
  "lunch",
  "events",
  "gallery",
  "catering",
] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

export const CONTENT_KEY = z.enum(CONTENT_KEYS);

export const PUBLICATION_STATES = ["draft", "published", "archived"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export function pickText(
  text: LocalizedText | null | undefined,
  locale: SupportedLocale,
): string {
  if (!text) return "";
  return text[locale] ?? text.de;
}

const localizedTextSchema = z
  .object({
    de: z.string().trim().min(1),
    en: z.string().trim().optional(),
    uk: z.string().trim().optional(),
  })
  .strict();

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const HOME_SCHEMA = z
  .object({
    hero: localizedTextSchema,
    storyTeaser: localizedTextSchema,
  })
  .strict();

export const ABOUT_SCHEMA = z
  .object({
    intro: localizedTextSchema,
    story: localizedTextSchema,
  })
  .strict();

const faqItemSchema = z
  .object({
    question: localizedTextSchema,
    answer: localizedTextSchema,
    category: z.string().trim().min(1),
  })
  .strict();

export const FAQ_SCHEMA = z
  .object({
    items: z.array(faqItemSchema),
  })
  .strict();

export const LUNCH_SCHEMA = z
  .object({
    intro: localizedTextSchema,
    validFrom: dateStringSchema,
    validUntil: dateStringSchema,
  })
  .strict();

const eventItemSchema = z
  .object({
    title: localizedTextSchema,
    summary: localizedTextSchema,
    startsAt: dateStringSchema,
    endsAt: dateStringSchema,
  })
  .strict();

export const EVENTS_SCHEMA = z
  .object({
    items: z.array(eventItemSchema),
  })
  .strict();

const galleryItemSchema = z
  .object({
    storagePath: z.string().trim().min(1),
    alt: localizedTextSchema,
  })
  .strict();

export const GALLERY_SCHEMA = z
  .object({
    items: z.array(galleryItemSchema),
  })
  .strict();

export const CATERING_SCHEMA = z
  .object({
    intro: localizedTextSchema,
    constraints: localizedTextSchema,
    responseNote: localizedTextSchema,
  })
  .strict();

export const CONTENT_SCHEMAS = {
  home: HOME_SCHEMA,
  about: ABOUT_SCHEMA,
  faq: FAQ_SCHEMA,
  lunch: LUNCH_SCHEMA,
  events: EVENTS_SCHEMA,
  gallery: GALLERY_SCHEMA,
  catering: CATERING_SCHEMA,
} satisfies Record<ContentKey, z.ZodTypeAny>;

type ContentPayloadMap = {
  [K in ContentKey]: z.infer<(typeof CONTENT_SCHEMAS)[K]>;
};

export function parseContentPayload<K extends ContentKey>(
  key: K,
  payload: unknown,
): ContentPayloadMap[K] | null {
  const parsed = CONTENT_SCHEMAS[key].safeParse(payload);
  return parsed.success ? (parsed.data as ContentPayloadMap[K]) : null;
}

export function isContentKey(value: string): value is ContentKey {
  return CONTENT_KEYS.includes(value as ContentKey);
}