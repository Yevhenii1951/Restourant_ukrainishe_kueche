import { describe, expect, it } from "vitest";
import {
  MENU_ITEM_ROW_SCHEMA,
  pickLocalized,
  SUPPORTED_LOCALES,
  toPublicMenuItem,
  type MenuItemRow,
} from "@/features/menu/domain";

describe("KLN-005 localized fallback", () => {
  it("returns the requested locale when present", () => {
    expect(pickLocalized({ de: "Borschtsch", en: "Borscht" }, "en")).toBe("Borscht");
  });

  it("falls back to German when a locale field is missing", () => {
    expect(pickLocalized({ de: "Borschtsch" }, "uk")).toBe("Borschtsch");
  });

  it("returns an empty string for an absent localized object", () => {
    expect(pickLocalized(null, "de")).toBe("");
  });
});

describe("KLN-005 menu row validation", () => {
  it("parses a valid public view row", () => {
    const row: MenuItemRow = {
      id: "30000000-0000-0000-0000-000000000001",
      slug: "borschtsch",
      category_id: "10000000-0000-0000-0000-000000000001",
      category_slug: "suppen",
      category_name_localized: { de: "Suppen" },
      name_localized: { de: "Borschtsch" },
      description_localized: { de: "Ukrainische Rote-Bete-Suppe" },
      portion_label_localized: { de: "Portion · 450 ml" },
      base_price_cents: 790,
      gluten_free: false,
      vegan: false,
      vegetarian: false,
      spicy: false,
      popular: true,
      sort_order: 1,
      category_sort_order: 1,
      allergens: [
        {
          code: "milk",
          label_localized: { de: "Milch" },
          containment: "contains",
        },
      ],
      additives: [],
      image_storage_path: "/2borsch.jpg",
      image_alt_localized: { de: "Borschtsch mit Dill" },
      image_mime: "image/jpeg",
    };
    expect(() => MENU_ITEM_ROW_SCHEMA.parse(row)).not.toThrow();
  });

  it("rejects an invalid containment value", () => {
    const row = {
      id: "30000000-0000-0000-0000-000000000001",
      slug: "borschtsch",
      category_id: "10000000-0000-0000-0000-000000000001",
      category_slug: "suppen",
      category_name_localized: { de: "Suppen" },
      name_localized: { de: "Borschtsch" },
      description_localized: { de: "Ukrainische Rote-Bete-Suppe" },
      portion_label_localized: { de: "Portion · 450 ml" },
      base_price_cents: 790,
      gluten_free: false,
      vegan: false,
      vegetarian: false,
      spicy: false,
      popular: true,
      sort_order: 1,
      category_sort_order: 1,
      allergens: [
        { code: "milk", label_localized: { de: "Milch" }, containment: "somehow" },
      ],
      additives: [],
    };
    expect(() => MENU_ITEM_ROW_SCHEMA.parse(row)).toThrow();
  });

  it("rejects a negative price", () => {
    const row = {
      id: "30000000-0000-0000-0000-000000000001",
      slug: "borschtsch",
      category_id: "10000000-0000-0000-0000-000000000001",
      category_slug: "suppen",
      category_name_localized: { de: "Suppen" },
      name_localized: { de: "Borschtsch" },
      description_localized: { de: "Ukrainische Rote-Bete-Suppe" },
      portion_label_localized: { de: "Portion · 450 ml" },
      base_price_cents: -1,
      gluten_free: false,
      vegan: false,
      vegetarian: false,
      spicy: false,
      popular: true,
      sort_order: 1,
      category_sort_order: 1,
      allergens: [],
      additives: [],
    };
    expect(() => MENU_ITEM_ROW_SCHEMA.parse(row)).toThrow();
  });
});

describe("KLN-005 DTO mapping", () => {
  const row: MenuItemRow = {
    id: "30000000-0000-0000-0000-000000000001",
    slug: "borschtsch",
    category_id: "10000000-0000-0000-0000-000000000001",
    category_slug: "suppen",
    category_name_localized: { de: "Suppen" },
    name_localized: { de: "Borschtsch", en: "Borscht" },
    description_localized: { de: "Ukrainische Rote-Bete-Suppe" },
    portion_label_localized: { de: "Portion · 450 ml" },
    base_price_cents: 790,
    gluten_free: false,
    vegan: false,
    vegetarian: false,
    spicy: false,
    popular: true,
    sort_order: 1,
    category_sort_order: 1,
    allergens: [
      {
        code: "milk",
        label_localized: { de: "Milch" },
        containment: "contains",
      },
    ],
    additives: [],
    image_storage_path: "/2borsch.jpg",
    image_alt_localized: { de: "Borschtsch mit Dill" },
    image_mime: "image/jpeg",
  };

  it("flattens localized fields for the requested locale", () => {
    const dto = toPublicMenuItem(row, "en");
    expect(dto.name).toBe("Borscht");
    expect(dto.description).toBe("Ukrainische Rote-Bete-Suppe"); // German fallback
    expect(dto.categoryName).toBe("Suppen"); // German fallback
  });

  it("keeps machine fields and money as integers", () => {
    const dto = toPublicMenuItem(row, "de");
    expect(dto.basePriceCents).toBe(790);
    expect(dto.allergens).toEqual([
      { code: "milk", label: "Milch", containment: "contains" },
    ]);
    expect(dto.image.alt).toBe("Borschtsch mit Dill");
    expect(dto.image.storagePath).toBe("/2borsch.jpg");
  });

  it("declares only the supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["de", "en", "uk"]);
  });
});