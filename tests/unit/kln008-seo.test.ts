import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";

describe("KLN-008 localized sitemap", () => {
  it("publishes canonical locale alternatives without sensitive routes", () => {
    const entries = sitemap();
    const contact = entries.find((entry) => entry.url.endsWith("/de/kontakt"));

    expect(contact).toEqual({
      url: "https://kalyna-demo.example/de/kontakt",
      alternates: {
        languages: {
          de: "https://kalyna-demo.example/de/kontakt",
          en: "https://kalyna-demo.example/en/kontakt",
          uk: "https://kalyna-demo.example/uk/kontakt",
          "x-default": "https://kalyna-demo.example/de/kontakt",
        },
      },
    });
    expect(entries.some((entry) => /admin|kasse|warenkorb|token/.test(entry.url))).toBe(false);
  });
});
