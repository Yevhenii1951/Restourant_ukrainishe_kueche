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
}

export interface PublicMenu {
  items: PublicMenuItem[];
  allergenReference: { code: string; label: string }[];
  additiveReference: { code: string; label: string }[];
}

export function pickLocalized(
  text: LocalizedText | null | undefined,
  locale: SupportedLocale,
): string {
  if (!text) return "";
  return text[locale] ?? text.de;
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
  };
}