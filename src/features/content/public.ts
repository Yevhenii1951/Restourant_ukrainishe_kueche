import { parseContentPayload, pickText, type ContentKey } from "./domain";
import type { SupportedLocale } from "@/features/menu/domain";

export interface PublicContentEntry {
  id: string;
  typedKey: ContentKey;
  payload: unknown;
  publishedAt: string | null;
}

export interface PublicHome {
  hero: string;
  storyTeaser: string;
}

export interface PublicAbout {
  intro: string;
  story: string;
}

export interface PublicFaqItem {
  question: string;
  answer: string;
  category: string;
}

export interface PublicFaq {
  items: PublicFaqItem[];
}

export interface PublicLunch {
  intro: string;
  validFrom: string;
  validUntil: string;
}

export interface PublicEvent {
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
}

export interface PublicEvents {
  items: PublicEvent[];
}

export interface PublicGalleryItem {
  storagePath: string;
  alt: string;
}

export interface PublicGallery {
  items: PublicGalleryItem[];
}

export interface PublicCatering {
  intro: string;
  constraints: string;
  responseNote: string;
}

export function resolveContent<T>(
  entries: PublicContentEntry[],
  key: ContentKey,
  map: (payload: unknown, locale: SupportedLocale) => T | null,
  locale: SupportedLocale,
): T | null {
  const entry = entries.find((candidate) => candidate.typedKey === key);
  if (!entry) return null;
  return map(entry.payload, locale);
}

export function resolveHome(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicHome | null {
  return resolveContent(entries, "home", (payload) => {
    const parsed = parseContentPayload("home", payload);
    if (!parsed) return null;
    return { hero: pickText(parsed.hero, locale), storyTeaser: pickText(parsed.storyTeaser, locale) };
  }, locale);
}

export function resolveAbout(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicAbout | null {
  return resolveContent(entries, "about", (payload) => {
    const parsed = parseContentPayload("about", payload);
    if (!parsed) return null;
    return { intro: pickText(parsed.intro, locale), story: pickText(parsed.story, locale) };
  }, locale);
}

export function resolveFaq(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicFaq | null {
  return resolveContent(entries, "faq", (payload) => {
    const parsed = parseContentPayload("faq", payload);
    if (!parsed) return null;
    return {
      items: parsed.items.map((item) => ({
        question: pickText(item.question, locale),
        answer: pickText(item.answer, locale),
        category: item.category,
      })),
    };
  }, locale);
}

export function resolveLunch(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicLunch | null {
  return resolveContent(entries, "lunch", (payload) => {
    const parsed = parseContentPayload("lunch", payload);
    if (!parsed) return null;
    return {
      intro: pickText(parsed.intro, locale),
      validFrom: parsed.validFrom,
      validUntil: parsed.validUntil,
    };
  }, locale);
}

export function resolveEvents(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicEvents | null {
  return resolveContent(entries, "events", (payload) => {
    const parsed = parseContentPayload("events", payload);
    if (!parsed) return null;
    return {
      items: parsed.items.map((item) => ({
        title: pickText(item.title, locale),
        summary: pickText(item.summary, locale),
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      })),
    };
  }, locale);
}

export function resolveGallery(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicGallery | null {
  return resolveContent(entries, "gallery", (payload) => {
    const parsed = parseContentPayload("gallery", payload);
    if (!parsed) return null;
    return {
      items: parsed.items.map((item) => ({
        storagePath: item.storagePath,
        alt: pickText(item.alt, locale),
      })),
    };
  }, locale);
}

export function resolveCatering(
  entries: PublicContentEntry[],
  locale: SupportedLocale,
): PublicCatering | null {
  return resolveContent(entries, "catering", (payload) => {
    const parsed = parseContentPayload("catering", payload);
    if (!parsed) return null;
    return {
      intro: pickText(parsed.intro, locale),
      constraints: pickText(parsed.constraints, locale),
      responseNote: pickText(parsed.responseNote, locale),
    };
  }, locale);
}