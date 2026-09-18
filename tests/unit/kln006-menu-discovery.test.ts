import { describe, expect, it } from "vitest";
import {
  MENU_ITEM_ROW_SCHEMA,
  MODIFIER_SELECTION_SCHEMA,
  computeModifierPriceDelta,
  filterMenuItems,
  toPublicMenuItem,
  validateModifierSelections,
  type MenuItemRow,
  type PublicMenuItem,
} from "@/features/menu/domain";

const CATEGORY_SUPPEN = { de: "Suppen", en: "Soups", uk: "Супи" };

function makeRow(overrides: Partial<MenuItemRow> = {}): MenuItemRow {
  return {
    id: "30000000-0000-0000-0000-000000000001",
    slug: "wareniki-kartoffeln",
    category_id: "10000000-0000-0000-0000-000000000002",
    category_slug: "hauptgerichte",
    category_name_localized: { de: "Hauptgerichte", en: "Main Courses", uk: "Основні страви" },
    name_localized: { de: "Wareniki mit Kartoffeln", uk: "Вареники з картоплею" },
    description_localized: { de: "Ukrainische Teigtaschen mit Kartoffelfüllung" },
    portion_label_localized: { de: "Portion · 8 Stück" },
    base_price_cents: 990,
    gluten_free: false,
    vegan: false,
    vegetarian: true,
    spicy: false,
    popular: true,
    sort_order: 1,
    category_sort_order: 2,
    allergens: [],
    additives: [],
    modifier_groups: [],
    image_storage_path: null,
    image_alt_localized: null,
    image_mime: null,
    ...overrides,
  };
}

function toDto(row: MenuItemRow, locale: "de" | "en" | "uk" = "de"): PublicMenuItem {
  return toPublicMenuItem(row, locale);
}

describe("KLN-006 localized search", () => {
  it("matches content of another locale than the active one", () => {
    const dto = toDto(makeRow(), "de");
    expect(filterMenuItems([dto], { query: "вареники" })).toHaveLength(1);
    expect(filterMenuItems([dto], { query: "wАренiки" })).toHaveLength(0);
  });

  it("matches the German description", () => {
    const dto = toDto(makeRow(), "de");
    expect(filterMenuItems([dto], { query: "kartoffelfüllung" })).toHaveLength(1);
  });

  it("is case-insensitive and trims the query", () => {
    const dto = toDto(makeRow(), "en");
    expect(filterMenuItems([dto], { query: "  WARENIKI  " })).toHaveLength(1);
  });

  it("returns an empty list when nothing matches", () => {
    const dto = toDto(makeRow(), "de");
    expect(filterMenuItems([dto], { query: "pizza" })).toHaveLength(0);
  });
});

describe("KLN-006 filters", () => {
  const rawRows = [
    makeRow({
      slug: "vegetarian-dish",
      vegetarian: true,
      vegan: false,
      spicy: false,
    }),
    makeRow({
      id: "30000000-0000-0000-0000-000000000002",
      slug: "vegan-dish",
      vegetarian: true,
      vegan: true,
      spicy: false,
    }),
    makeRow({
      id: "30000000-0000-0000-0000-000000000003",
      slug: "spicy-dish",
      vegetarian: false,
      vegan: false,
      spicy: true,
    }),
    makeRow({
      id: "30000000-0000-0000-0000-000000000004",
      slug: "gluten-free-dish",
      vegetarian: false,
      gluten_free: true,
    }),
  ];
  const items = rawRows.map((row) => toDto(row));

  it("filters by dietary flags", () => {
    expect(filterMenuItems(items, { vegan: true }).map((i) => i.slug)).toEqual(["vegan-dish"]);
    expect(filterMenuItems(items, { vegetarian: true }).map((i) => i.slug)).toEqual([
      "vegetarian-dish",
      "vegan-dish",
    ]);
    expect(filterMenuItems(items, { spicy: true }).map((i) => i.slug)).toEqual(["spicy-dish"]);
  });

  it("filters by category slug", () => {
    const dto = toDto(makeRow({ category_slug: "beilagen", category_name_localized: CATEGORY_SUPPEN }));
    expect(filterMenuItems([dto, ...items], { categorySlug: "beilagen" })).toHaveLength(1);
  });

  it("combines filters with AND logic", () => {
    expect(filterMenuItems(items, { vegetarian: true, vegan: true })).toHaveLength(1);
    expect(filterMenuItems(items, { vegetarian: true, spicy: true })).toHaveLength(0);
  });

  it("uses the declared gluten-free flag independently of allergen entries", () => {
    const withGlutenFlagDeactivated = toDto(
      makeRow({
        slug: "not-flagged",
        vegetarian: false,
        gluten_free: false,
        allergens: [],
      }),
    );
    expect(filterMenuItems([...items, withGlutenFlagDeactivated], { glutenFree: true })).toEqual([
      toDto(
        makeRow({
          id: "30000000-0000-0000-0000-000000000004",
          slug: "gluten-free-dish",
          vegetarian: false,
          gluten_free: true,
        }),
      ),
    ]);
  });
});

describe("KLN-006 German fallback", () => {
  it("renders the German description when Ukrainian is missing", () => {
    const row = makeRow({
      description_localized: { de: "Ukrainische Teigtaschen mit Kartoffelfüllung" },
    });
    const dto = toDto(row, "uk");
    expect(dto.description).toBe("Ukrainische Teigtaschen mit Kartoffelfüllung");
    expect(dto.categoryName).toBe("Основні страви"); // Ukrainian present
  });
});

describe("KLN-006 shared modifier schema", () => {
  const validGroup = {
    id: "40000000-0000-0000-0000-000000000001",
    menu_item_id: "30000000-0000-0000-0000-000000000006",
    name_localized: { de: "Beilage", en: "Side dish", uk: "Гарнір" },
    min_selections: 1,
    max_selections: 1,
    required: true,
    sort_order: 1,
    options: [
      {
        id: "50000000-0000-0000-0000-000000000001",
        name_localized: { de: "Kartoffeln" },
        price_delta_cents: 0,
        sort_order: 1,
      },
      {
        id: "50000000-0000-0000-0000-000000000002",
        name_localized: { de: "Pommes frites" },
        price_delta_cents: 150,
        sort_order: 2,
      },
    ],
  };

  it("parses a menu row holding a required modifier group", () => {
    const row = makeRow({ modifier_groups: [validGroup] });
    expect(() => MENU_ITEM_ROW_SCHEMA.parse(row)).not.toThrow();
  });

  it("rejects a group with min greater than max", () => {
    const row = makeRow({
      modifier_groups: [
        { ...validGroup, min_selections: 2, max_selections: 1 },
      ],
    });
    expect(() => MENU_ITEM_ROW_SCHEMA.parse(row)).toThrow();
  });

  it("rejects a negative price delta", () => {
    const row = makeRow({
      modifier_groups: [
        {
          ...validGroup,
          options: [{ ...validGroup.options[0], price_delta_cents: -10 }],
        },
      ],
    });
    expect(() => MENU_ITEM_ROW_SCHEMA.parse(row)).toThrow();
  });
});

describe("KLN-006 selection validation", () => {
  const group = {
    id: "40000000-0000-0000-0000-000000000001",
    name: "Beilage",
    minSelections: 1,
    maxSelections: 1,
    required: true,
    options: [
      { id: "50000000-0000-0000-0000-000000000001", name: "Kartoffeln", priceDeltaCents: 0 },
      { id: "50000000-0000-0000-0000-000000000002", name: "Pommes frites", priceDeltaCents: 150 },
    ],
  };

  it("explains that no option is selected for a required group", () => {
    const issues = validateModifierSelections([group], []);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      groupId: group.id,
      minSelections: 1,
      maxSelections: 1,
      selectedCount: 0,
    });
  });

  it("explains that too many options are selected", () => {
    const issues = validateModifierSelections([group], [
      {
        groupId: group.id,
        optionIds: group.options.map((option) => option.id),
      },
    ]);
    expect(issues[0].selectedCount).toBe(2);
  });

  it("reports no issue for exactly the required count", () => {
    const issues = validateModifierSelections([group], [
      {
        groupId: group.id,
        optionIds: [group.options[1].id],
      },
    ]);
    expect(issues).toHaveLength(0);
  });

  it("ignores option ids that do not belong to the group", () => {
    const issues = validateModifierSelections([group], [
      {
        groupId: group.id,
        optionIds: [group.options[0].id, "00000000-0000-0000-0000-000000000000"],
      },
    ]);
    expect(issues).toHaveLength(0);
  });

  it("computes the server-side price delta from selected options", () => {
    const delta = computeModifierPriceDelta([group], [
      { groupId: group.id, optionIds: [group.options[1].id] },
    ]);
    expect(delta).toBe(150);
  });

  it("exposes a server-ready zod selection schema", () => {
    expect(
      MODIFIER_SELECTION_SCHEMA.parse({
        groupId: group.id,
        optionIds: [group.options[0].id],
      }),
    ).toEqual({ groupId: group.id, optionIds: [group.options[0].id] });
    expect(() =>
      MODIFIER_SELECTION_SCHEMA.parse({ groupId: group.id, optionIds: ["nope"] }),
    ).toThrow();
  });
});