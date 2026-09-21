import { describe, expect, it } from "vitest";
import {
  getDemoPublicContentEntries,
  withDemoContentFallback,
} from "@/features/content/demoContent";
import { resolveGallery } from "@/features/content/public";
import {
  getDemoPublicMenu,
  withDemoMenuFallback,
} from "@/features/menu/demoMenu";

describe("demo content fallback", () => {
  it("renders menu cards with local public images without a database", () => {
    const menu = getDemoPublicMenu();

    expect(menu.items.length).toBeGreaterThanOrEqual(6);
    expect(menu.items.every((item) => item.image.storagePath)).toBe(true);
    expect(menu.items.map((item) => item.image.storagePath)).toContain(
      "/2borsch.jpg",
    );
  });

  it("renders gallery images without a database", () => {
    const gallery = resolveGallery(getDemoPublicContentEntries(), "de");

    expect(gallery?.items.length).toBeGreaterThanOrEqual(4);
    expect(gallery?.items.map((item) => item.storagePath)).toContain(
      "/vareniki1.jpg",
    );
  });

  it("falls back when a connected store returns no public data", () => {
    expect(
      withDemoMenuFallback({
        items: [],
        allergenReference: [],
        additiveReference: [],
      }).items,
    ).toHaveLength(6);
    expect(withDemoContentFallback([])).toHaveLength(7);
  });
});
