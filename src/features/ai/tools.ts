import { z } from "zod";
import { resolveFaq } from "@/features/content/public";
import { getPublicContentEntries } from "@/features/content/service";
import { getPublicOpeningHours } from "@/features/contact/openingHours";
import { getPublicMenu } from "@/features/menu/service";
import { getPublicDeliveryZone } from "@/features/quote/service";
import { getReservationSlots } from "@/features/reservation/service";

export const AI_LOCALE_SCHEMA = z.enum(["de", "en", "uk"]);
export type AiLocale = z.infer<typeof AI_LOCALE_SCHEMA>;

const searchMenuInput = z.object({ query: z.string().trim().min(1).max(80) }).strict();
const openingHoursInput = z.object({ date: z.string().date().optional() }).strict();
const deliveryInput = z.object({ postalCode: z.string().regex(/^\d{5}$/) }).strict();
const reservationInput = z.object({ date: z.string().date(), partySize: z.number().int().min(1).max(20) }).strict();
const faqInput = z.object({ query: z.string().trim().min(1).max(80) }).strict();

export const AI_TOOL_INPUTS = {
  searchMenu: searchMenuInput,
  getOpeningHours: openingHoursInput,
  getDeliveryInfo: deliveryInput,
  checkReservationAvailability: reservationInput,
  searchFaq: faqInput,
} as const;

export type AiToolName = keyof typeof AI_TOOL_INPUTS;

export interface AiToolDeps {
  getMenu: typeof getPublicMenu;
  getHours: typeof getPublicOpeningHours;
  getDeliveryZone: typeof getPublicDeliveryZone;
  getSlots: typeof getReservationSlots;
  getFaq: typeof getPublicContentEntries;
}

const productionDeps: AiToolDeps = {
  getMenu: getPublicMenu,
  getHours: getPublicOpeningHours,
  getDeliveryZone: getPublicDeliveryZone,
  getSlots: getReservationSlots,
  getFaq: getPublicContentEntries,
};

export async function executeAiTool(
  name: AiToolName,
  input: unknown,
  locale: AiLocale,
  deps: AiToolDeps = productionDeps,
): Promise<unknown> {
  if (name === "searchMenu") {
    const parsed = searchMenuInput.parse(input);
    const query = parsed.query.toLocaleLowerCase(locale);
    const menu = await deps.getMenu(locale);
    const matches = menu.items.filter((item) => item.searchText.includes(query));
    return (matches.length > 0 ? matches : menu.items).slice(0, 5).map((item) => ({
      name: item.name, description: item.description, priceCents: item.basePriceCents,
      allergens: item.allergens.map(({ label, containment }) => ({ label, containment })),
    }));
  }
  if (name === "getOpeningHours") {
    openingHoursInput.parse(input);
    return deps.getHours();
  }
  if (name === "getDeliveryInfo") {
    const parsed = deliveryInput.parse(input);
    const zone = await deps.getDeliveryZone(parsed.postalCode);
    return zone ? { available: true, feeCents: zone.feeCents, minimumCents: zone.minimumCents, freeDeliveryCents: zone.freeDeliveryCents } : { available: false };
  }
  if (name === "checkReservationAvailability") {
    const parsed = reservationInput.parse(input);
    const slots = await deps.getSlots(parsed);
    return slots.status === "slots" ? { available: slots.slots.length > 0, slots: slots.slots.slice(0, 5) } : { available: false };
  }
  const parsed = faqInput.parse(input);
  const entries = await deps.getFaq();
  const faq = resolveFaq(entries, locale);
  const query = parsed.query.toLocaleLowerCase(locale);
  return (faq?.items ?? []).filter((item) => `${item.question} ${item.answer}`.toLocaleLowerCase(locale).includes(query)).slice(0, 5);
}

export function classifyAiQuestion(message: string): { tool: AiToolName; input: unknown } | null {
  const normalized = message.toLowerCase();
  if (/allerg|allergy|allergie/.test(normalized)) return null;
  if (/\b(menu|karte|gericht|dish|страв)/.test(normalized)) return { tool: "searchMenu", input: { query: message } };
  if (/öffn|opening|годин|hours?/.test(normalized)) return { tool: "getOpeningHours", input: {} };
  const postalCode = message.match(/\b\d{5}\b/)?.[0];
  if (postalCode && /liefer|delivery|достав/.test(normalized)) return { tool: "getDeliveryInfo", input: { postalCode } };
  const date = message.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  const partySize = Number(message.match(/\b(\d{1,2})\s*(personen?|people|гост)/)?.[1]);
  if (date && partySize && /reserv|table|tisch|стол/.test(normalized)) return { tool: "checkReservationAvailability", input: { date, partySize } };
  if (/faq|frage|question|питан/.test(normalized)) return { tool: "searchFaq", input: { query: message } };
  return null;
}
