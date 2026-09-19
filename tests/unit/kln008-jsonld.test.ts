import { describe, expect, it } from "vitest";
import { buildRestaurantJsonLd } from "@/features/seo/restaurantJsonLd";

describe("KLN-008 Restaurant JSON-LD", () => {
  it("contains only visible demo facts and no invented reputation data", () => {
    const jsonLd = buildRestaurantJsonLd("de");

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: "Kalyna Demo-Restaurant (Portfolio-Projekt)",
      telephone: "+49 561 0000000",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Musterstraße 1 (nicht realer Standort)",
        postalCode: "34117",
        addressLocality: "Kassel",
        addressCountry: "DE",
      },
      menu: "https://kalyna-demo.example/de/speisekarte",
    });
    expect(jsonLd).not.toHaveProperty("aggregateRating");
    expect(jsonLd).not.toHaveProperty("review");
  });
});
