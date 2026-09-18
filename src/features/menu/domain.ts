import { z } from "zod";

export const SUPPORTED_LOCALES = ["de", "en", "uk"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocalizedText = { de: string; en?: string; uk?: string };

export const CONTAINMENTS = ["contains", "may_contain"] as const;
export type Containment = (typeof CONTAINMENTS)[number];

const localizedTextSchema = z.object({
  de: z.string(),
  en: z.string().optional(),
  uk: z.string().optional(),
});

const modifierOptionRowSchema = z.object({
  id: z.string().uuid(),
  name_localized: localizedTextSchema,
  price_delta_cents: z.number().int().nonnegative(),
  sort_order: z.number().int(),
});

const modifierGroupRowSchema = z
  .object({
    id: z.string().uuid(),
    menu_item_id: z.string().uuid(),
    name_localized: localizedTextSchema,
    min_selections: z.number().int().nonnegative(),
    max_selections: z.number().int(),
    required: z.boolean(),
    sort_order: z.number().int(),
    options: z.array(modifierOptionRowSchema),
  })
  .superRefine((group, ctx) => {
    if (group.max_selections < group.min_selections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["max_selections"],
        message: "max_selections must be greater than or equal to min_selections",
      });
    }
    if (group.required !== (group.min_selections > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["required"],
        message: "required must equal (min_selections > 0)",
      });
    }
  });

export const MENU_ITEM_ROW_SCHEMA = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  category_id: z.string().uuid(),
  category_slug: z.string().min(1),
  category_name_localized: localizedTextSchema,
  name_localized: localizedTextSchema,
  description_localized: localizedTextSchema,
  portion_label_localized: localizedTextSchema,
  base_price_cents: z.number().int().nonnegative(),
  gluten_free: z.boolean(),
  vegan: z.boolean(),
  vegetarian: z.boolean(),
  spicy: z.boolean(),
  popular: z.boolean(),
  sort_order: z.number().int(),
  category_sort_order: z.number().int(),
  allergens: z.array(
    z.object({
      code: z.string().min(1),
      label_localized: localizedTextSchema,
      containment: z.enum(CONTAINMENTS),
    }),
  ),
  additives: z.array(
    z.object({
      code: z.string().min(1),
      label_localized: localizedTextSchema,
    }),
  ),
  image_storage_path: z.string().nullable(),
  image_alt_localized: localizedTextSchema.nullable(),
  image_mime: z.string().nullable(),
  modifier_groups: z.array(modifierGroupRowSchema).optional(),
});

export type MenuItemRow = z.infer<typeof MENU_ITEM_ROW_SCHEMA>;

export interface PublicAllergen {
  code: string;
  label: string;
  containment: Containment;
}

export interface PublicAdditive {
  code: string;
  label: string;
}

export interface PublicMenuImage {
  storagePath: string | null;
  alt: string | null;
}

export interface PublicModifierOption {
  id: string;
  name: string;
  priceDeltaCents: number;
}

export interface PublicModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  options: PublicModifierOption[];
}

export interface PublicMenuItem {
  id: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  description: string;
  portionLabel: string;
  basePriceCents: number;
  glutenFree: boolean;
  vegan: boolean;
  vegetarian: boolean;
  spicy: boolean;
  popular: boolean;
  allergens: PublicAllergen[];
  additives: PublicAdditive[];
  image: PublicMenuImage;
  sortOrder: number;
  categorySortOrder: number;
  modifierGroups: PublicModifierGroup[];
  searchText: string;
}

export interface PublicMenu {
  items: PublicMenuItem[];
  allergenReference: { code: string; label: string }[];
  additiveReference: { code: string; label: string }[];
}

export interface MenuFilter {
  query?: string;
  categorySlug?: string;
  vegan?: boolean;
  vegetarian?: boolean;
  spicy?: boolean;
  popular?: boolean;
  glutenFree?: boolean;
}

export function pickLocalized(
  text: LocalizedText | null | undefined,
  locale: SupportedLocale,
): string {
  if (!text) return "";
  return text[locale] ?? text.de;
}

function buildSearchText(...texts: Array<LocalizedText | null | undefined>): string {
  return texts
    .flatMap((text) => {
      if (!text) return [];
      return [text.de, text.en, text.uk].filter(Boolean) as string[];
    })
    .join(" ")
    .toLowerCase();
}

export function toPublicMenuItem(
  row: MenuItemRow,
  locale: SupportedLocale,
): PublicMenuItem {
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: pickLocalized(row.category_name_localized, locale),
    name: pickLocalized(row.name_localized, locale),
    description: pickLocalized(row.description_localized, locale),
    portionLabel: pickLocalized(row.portion_label_localized, locale),
    basePriceCents: row.base_price_cents,
    glutenFree: row.gluten_free,
    vegan: row.vegan,
    vegetarian: row.vegetarian,
    spicy: row.spicy,
    popular: row.popular,
    allergens: row.allergens.map((allergen) => ({
      code: allergen.code,
      label: pickLocalized(allergen.label_localized, locale),
      containment: allergen.containment,
    })),
    additives: row.additives.map((additive) => ({
      code: additive.code,
      label: pickLocalized(additive.label_localized, locale),
    })),
    image: {
      storagePath: row.image_storage_path,
      alt: row.image_alt_localized
        ? pickLocalized(row.image_alt_localized, locale)
        : null,
    },
    sortOrder: row.sort_order,
    categorySortOrder: row.category_sort_order,
    modifierGroups: (row.modifier_groups ?? []).map((group) => ({
      id: group.id,
      name: pickLocalized(group.name_localized, locale),
      minSelections: group.min_selections,
      maxSelections: group.max_selections,
      required: group.required,
      options: group.options.map((option) => ({
        id: option.id,
        name: pickLocalized(option.name_localized, locale),
        priceDeltaCents: option.price_delta_cents,
      })),
    })),
    searchText: buildSearchText(row.name_localized, row.description_localized),
  };
}

export function filterMenuItems(
  items: PublicMenuItem[],
  filter: MenuFilter,
): PublicMenuItem[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return items.filter((item) => {
    if (query !== "" && !item.searchText.includes(query)) return false;
    if (filter.categorySlug && item.categorySlug !== filter.categorySlug) return false;
    if (filter.vegan && !item.vegan) return false;
    if (filter.vegetarian && !item.vegetarian) return false;
    if (filter.spicy && !item.spicy) return false;
    if (filter.popular && !item.popular) return false;
    if (filter.glutenFree && !item.glutenFree) return false;
    return true;
  });
}

export const MODIFIER_SELECTION_SCHEMA = z.object({
  groupId: z.string().uuid(),
  optionIds: z.array(z.string().uuid()),
});
export type ModifierSelection = z.infer<typeof MODIFIER_SELECTION_SCHEMA>;

export interface ModifierSelectionIssue {
  groupId: string;
  groupName: string;
  minSelections: number;
  maxSelections: number;
  selectedCount: number;
}

function selectedOptionIds(group: PublicModifierGroup, selection?: ModifierSelection): string[] {
  if (!selection) return [];
  const valid = new Set(group.options.map((option) => option.id));
  return [...new Set(selection.optionIds)].filter((optionId) => valid.has(optionId));
}

export function validateModifierSelections(
  groups: PublicModifierGroup[],
  selections: ModifierSelection[],
): ModifierSelectionIssue[] {
  const byGroup = new Map(selections.map((selection) => [selection.groupId, selection]));
  const issues: ModifierSelectionIssue[] = [];
  for (const group of groups) {
    const selectedCount = selectedOptionIds(group, byGroup.get(group.id)).length;
    if (selectedCount < group.minSelections || selectedCount > group.maxSelections) {
      issues.push({
        groupId: group.id,
        groupName: group.name,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        selectedCount,
      });
    }
  }
  return issues;
}

export function computeModifierPriceDelta(
  groups: PublicModifierGroup[],
  selections: ModifierSelection[],
): number {
  const byGroup = new Map(selections.map((selection) => [selection.groupId, selection]));
  return groups.reduce((total, group) => {
    const optionIds = selectedOptionIds(group, byGroup.get(group.id));
    for (const option of group.options) {
      if (optionIds.includes(option.id)) {
        total += option.priceDeltaCents;
      }
    }
    return total;
  }, 0);
}