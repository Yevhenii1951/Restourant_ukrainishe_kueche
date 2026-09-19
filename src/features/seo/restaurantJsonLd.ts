import { localizedSiteUrl, type SiteLocale } from "./site";
import { getStructuredOpeningHours } from "@/features/contact/openingHours";

export function buildRestaurantJsonLd(locale: SiteLocale): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Kalyna Demo-Restaurant (Portfolio-Projekt)",
    description: "Portfolio-Demo - kein realer Restaurantbetrieb.",
    url: localizedSiteUrl(locale, ""),
    menu: localizedSiteUrl(locale, "/speisekarte"),
    telephone: "+49 561 0000000",
    servesCuisine: "Ukrainian",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Musterstraße 1 (nicht realer Standort)",
      postalCode: "34117",
      addressLocality: "Kassel",
      addressCountry: "DE",
    },
    openingHoursSpecification: getStructuredOpeningHours(),
  };
}
