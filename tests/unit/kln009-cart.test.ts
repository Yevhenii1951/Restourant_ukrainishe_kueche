import { describe, expect, it } from "vitest";
import {
  CART_VERSION,
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
  addLineToCart,
  countCartItems,
  dropUnavailableSelections,
  estimateLineTotalCents,
  parseCartPayload,
  removeLineAt,
  setLineQuantity,
  validateCart,
  type Cart,
  type CartLine,
} from "@/features/cart/domain";
import type { PublicMenuItem, PublicModifierGroup } from "@/features/menu/domain";

const GROUP = "40000000-0000-0000-0000-000000000001";
const OPTION_A = "41000000-0000-0000-0000-000000000001";
const OPTION_B = "41000000-0000-0000-0000-000000000002";
const ITEM = "30000000-0000-0000-0000-000000000001";
const STALE_ITEM = "30000000-0000-0000-0000-000000000099";
const UNKNOWN_ITEM = "99999999-0000-0000-0000-000000000000";

function makeItem(
  id: string,
  basePriceCents = 1000,
  modifierGroups: PublicModifierGroup[] = [],
): PublicMenuItem {
  return {
    id,
    slug: id,
    categoryId: "10000000-0000-0000-0000-000000000001",
    categorySlug: "suppen",
    categoryName: "Suppen",
    name: "Testgericht",
    description: "",
    portionLabel: "Portion",
    basePriceCents,
    glutenFree: false,
    vegan: false,
    vegetarian: false,
    spicy: false,
    popular: false,
    allergens: [],
    additives: [],
    image: { storagePath: null, alt: null },
    sortOrder: 0,
    categorySortOrder: 0,
    modifierGroups,
    searchText: "testgericht",
  };
}

function makeGroup(
  id: string,
  minSelections: number,
  maxSelections: number,
  optionIds: string[],
): PublicModifierGroup {
  return {
    id,
    name: "Extra",
    minSelections,
    maxSelections,
    required: minSelections > 0,
    options: optionIds.map((optionId, index) => ({
      id: optionId,
      name: `Option ${index}`,
      priceDeltaCents: 200,
    })),
  };
}

const itemsById = new Map([
  [ITEM, makeItem(ITEM, 1000, [makeGroup(GROUP, 1, 2, [OPTION_A, OPTION_B])])],
  [STALE_ITEM, makeItem(STALE_ITEM)],
]);
const cartWithUnknownItem = cart([line({ menuItemId: UNKNOWN_ITEM, modifierSelections: [] })]);

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    menuItemId: ITEM,
    quantity: 2,
    modifierSelections: [{ groupId: GROUP, optionIds: [OPTION_A] }],
    ...overrides,
  };
}

function cart(cartLines: CartLine[]): Cart {
  return { version: CART_VERSION, lines: cartLines };
}

describe("KLN-009 storage shape stays PII-free (FR-CART-2)", () => {
  it("parses a valid cart with ids and quantity only", () => {
    const parsed = parseCartPayload(cart([line()]));
    expect(parsed?.lines).toHaveLength(1);
    expect(parsed?.lines[0]).toEqual(line());
  });

  it("rejects lines that smuggle contact data (strict schema)", () => {
    const leaked = {
      version: CART_VERSION,
      lines: [{ ...line(), email: "a@b.de" }],
    };
    expect(parseCartPayload(leaked)).toBeNull();
  });

  it("rejects lines that store trusted prices", () => {
    const tampered = {
      version: CART_VERSION,
      lines: [{ ...line(), priceCents: 500 }],
    };
    expect(parseCartPayload(tampered)).toBeNull();
  });

  it("keeps an empty cart parseable and rejects other shapes or versions", () => {
    expect(parseCartPayload(cart([]))?.lines).toHaveLength(0);
    expect(parseCartPayload(null)).toBeNull();
    expect(parseCartPayload("gar kein Warenkorb")).toBeNull();
    expect(parseCartPayload({ version: 2, lines: [line()] })).toBeNull();
  });

  it("rejects invalid quantities and ids", () => {
    expect(parseCartPayload(cart([line({ quantity: 0 })]))).toBeNull();
    expect(parseCartPayload(cart([line({ quantity: MAX_LINE_QUANTITY + 1 })]))).toBeNull();
    expect(parseCartPayload(cart([line({ quantity: 1.5 })]))).toBeNull();
    expect(parseCartPayload(cart([line({ menuItemId: "keine-uuid" })]))).toBeNull();
  });
});

describe("KLN-009 quantity boundaries (FR-CART-1)", () => {
  it("flags quantities outside [1, 100] during revalidation", () => {
    const issues = validateCart(cart([line({ quantity: 0 })]), itemsById);
    expect(issues).toEqual([{ lineIndex: 0, kind: "invalid-quantity", actual: 0 }]);
  });

  it("accepts boundary quantities", () => {
    expect(
      validateCart(
        cart([
          line({ quantity: MIN_LINE_QUANTITY }),
          line({ quantity: MAX_LINE_QUANTITY, menuItemId: STALE_ITEM, modifierSelections: [] }),
        ]),
        itemsById,
      ).filter((issue) => issue.kind === "invalid-quantity"),
    ).toHaveLength(0);
  });

  it("clamps quantity when merging lines", () => {
    const merged = addLineToCart(cart([line({ quantity: 60 })]), line({ quantity: 60 }));
    expect(merged.lines).toHaveLength(1);
    expect(merged.lines[0].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("clamps updated quantities to the allowed range", () => {
    const clamped = setLineQuantity(cart([line()]), 0, 999);
    expect(clamped.lines[0].quantity).toBe(MAX_LINE_QUANTITY);
    const clampedLow = setLineQuantity(cart([line()]), 0, 0);
    expect(clampedLow.lines[0].quantity).toBe(MIN_LINE_QUANTITY);
  });
});

describe("KLN-009 modifier rules during revalidation (FR-CART-1)", () => {
  it("reports a required group without enough selections", () => {
    const issues = validateCart(
      cart([line({ modifierSelections: [{ groupId: GROUP, optionIds: [] }] })]),
      itemsById,
    );
    expect(issues).toEqual([
      {
        lineIndex: 0,
        kind: "too-few-selections",
        groupId: GROUP,
        expectedMin: 1,
        expectedMax: 2,
        actual: 0,
      },
    ]);
  });

  it("reports selections above the group maximum", () => {
    const rejection = makeGroup(GROUP, 0, 1, [OPTION_A, OPTION_B]);
    const issues = validateCart(
      cart([line({ modifierSelections: [{ groupId: GROUP, optionIds: [OPTION_A, OPTION_B, OPTION_A] }] })]),
      new Map([[ITEM, makeItem(ITEM, 1000, [rejection])]]),
    );
    expect(issues).toEqual([
      {
        lineIndex: 0,
        kind: "too-many-selections",
        groupId: GROUP,
        expectedMax: 1,
        actual: 2,
      },
    ]);
  });

  it("reports a selected option that is no longer offered", () => {
    const stale = makeGroup(GROUP, 1, 2, [OPTION_A]);
    const issues = validateCart(
      cart([line({ modifierSelections: [{ groupId: GROUP, optionIds: [OPTION_A, OPTION_B] }] })]),
      new Map([[ITEM, makeItem(ITEM, 1000, [stale])]]),
    );
    expect(issues).toEqual([
      { lineIndex: 0, kind: "unavailable-option", optionId: OPTION_B },
    ]);
  });

  it("reports selections for a group that no longer exists", () => {
    const issues = validateCart(
      cart([line({ modifierSelections: [{ groupId: GROUP, optionIds: [OPTION_A] }] })]),
      new Map([[ITEM, makeItem(ITEM, 1000, [])]]),
    );
    expect(issues).toEqual([
      { lineIndex: 0, kind: "unavailable-option", optionId: OPTION_A },
    ]);
  });

  it("produces no issues for a valid selection", () => {
    expect(validateCart(cart([line()]), itemsById)).toEqual([]);
  });
});

describe("KLN-009 revalidation against the server menu (FR-CART-2)", () => {
  it("blocks a cart that references a dish no longer on the menu", () => {
    const issues = validateCart(cartWithUnknownItem, itemsById);
    expect(issues).toEqual([{ lineIndex: 0, kind: "not-on-menu" }]);
  });
});

describe("KLN-009 estimated totals are UI-only (FR-CART-3)", () => {
  it("estimates base plus modifier deltas times quantity", () => {
    const estimate = estimateLineTotalCents(itemsById.get(ITEM)!, line());
    expect(estimate).toBe(2400);
  });

  it("estimates base price alone when nothing is selected", () => {
    const estimate = estimateLineTotalCents(
      itemsById.get(ITEM)!,
      line({ quantity: 3, modifierSelections: [] }),
    );
    expect(estimate).toBe(3000);
  });
});

describe("KLN-009 cart line mutations", () => {
  it("adds a distinct configuration as a new line", () => {
    const next = addLineToCart(cart([line()]), line({ modifierSelections: [] }));
    expect(next.lines).toHaveLength(2);
  });

  it("increments quantity for an identical configuration", () => {
    const next = addLineToCart(cart([line()]), line());
    expect(next.lines).toHaveLength(1);
    expect(next.lines[0].quantity).toBe(4);
  });

  it("removes a line by index and counts items", () => {
    const c = cart([line(), line({ modifierSelections: [] })]);
    expect(countCartItems(c)).toBe(4);
    expect(removeLineAt(c, 0).lines).toHaveLength(1);
    expect(removeLineAt(c, 0).lines[0].menuItemId).toBe(ITEM);
  });

  it("drops only the options that are no longer offered", () => {
    const stale = makeGroup(GROUP, 1, 2, [OPTION_A]);
    const repaired = dropUnavailableSelections(
      line({ modifierSelections: [{ groupId: GROUP, optionIds: [OPTION_A, OPTION_B] }] }),
      makeItem(ITEM, 1000, [stale]),
    );
    expect(repaired.modifierSelections[0].optionIds).toEqual([OPTION_A]);
  });
});