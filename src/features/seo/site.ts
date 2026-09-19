import { z } from "zod";
import { routing } from "@/i18n/routing";

export const SITE_URL = "https://kalyna-demo.example";
export const SITE_LOCALES = routing.locales;
export type SiteLocale = (typeof SITE_LOCALES)[number];

const supportedLocaleSchema = z.enum(SITE_LOCALES);

export function parseSupportedLocale(value: string): SiteLocale {
  return supportedLocaleSchema.parse(value);
}

export function localizedSiteUrl(locale: SiteLocale, path: string): string {
  return `${SITE_URL}/${locale}${path}`;
}
