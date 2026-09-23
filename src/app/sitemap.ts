import type { MetadataRoute } from "next";
import { localizedSiteUrl, SITE_LOCALES } from "@/features/seo/site";
const INDEXABLE_PATHS = [
  "",
  "/speisekarte",
  "/mittagstisch",
  "/ueber-uns",
  "/catering",
  "/events",
  "/galerie",
  "/kontakt",
  "/anfahrt",
  "/faq",
  "/meine-anfragen",
  "/impressum",
  "/datenschutz",
  "/agb",
] as const;


export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.flatMap((path) => {
    const languages = {
      de: localizedSiteUrl("de", path),
      en: localizedSiteUrl("en", path),
      uk: localizedSiteUrl("uk", path),
      "x-default": localizedSiteUrl("de", path),
    };

    return SITE_LOCALES.map((locale) => ({
      url: localizedSiteUrl(locale, path),
      alternates: { languages },
    }));
  });
}
