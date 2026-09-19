import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConsentMap from "@/features/contact/components/ConsentMap";

describe("KLN-008 map consent", () => {
  it("renders the useful fallback without loading a tile provider by default", () => {
    const html = renderToStaticMarkup(
      createElement(ConsentMap, {
        consentLabel: "Karte laden",
        consentNotice: "Erst nach Zustimmung werden Kartenkacheln geladen.",
        mapLabel: "Ungefährer Demo-Standort in Kassel",
      }),
    );

    expect(html).toContain("Karte laden");
    expect(html).toContain("Erst nach Zustimmung werden Kartenkacheln geladen.");
    expect(html).not.toContain("tile.openstreetmap.org");
  });
});
