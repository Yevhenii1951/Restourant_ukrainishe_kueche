import {
  MENU_ITEM_ROW_SCHEMA,
  pickLocalized,
  toPublicMenuItem,
  type MenuItemRow,
  type PublicMenu,
  type SupportedLocale,
} from "./domain";
import { parseReferenceRow, type MenuStore } from "./store";

type MenuItemDbRow = {
  id: string;
  slug: string;
  category_id: string;
  category_slug: string;
  category_name_localized: unknown;
  name_localized: unknown;
  description_localized: unknown;
  portion_label_localized: unknown;
  base_price_cents: number;
  gluten_free: boolean;
  vegan: boolean;
  vegetarian: boolean;
  spicy: boolean;
  popular: boolean;
  sort_order: number;
  category_sort_order: number;
  allergens: unknown;
  additives: unknown;
  image_storage_path: string | null;
  image_alt_localized: unknown;
  image_mime: string | null;
  modifier_groups: unknown;
};

function rowToItemRow(row: MenuItemDbRow): MenuItemRow {
  return MENU_ITEM_ROW_SCHEMA.parse(row);
}

type Queryable = { query<T>(query: string): Promise<{ rows: T[] }> };

export function createPostgresMenuStore(db: Queryable): MenuStore {
  return {
    async listPublicMenu(locale: SupportedLocale): Promise<PublicMenu> {
      const itemsResult = await db.query<MenuItemDbRow>(
        `SELECT id, slug, category_id, category_slug, category_name_localized,
                name_localized, description_localized, portion_label_localized,
                base_price_cents, gluten_free, vegan, vegetarian, spicy, popular,
                sort_order, category_sort_order, allergens, additives,
                image_storage_path, image_alt_localized, image_mime, modifier_groups
         FROM menu_items_public`,
      );
      const allergensResult = await db.query<Record<string, unknown>>(
        "SELECT code, label_localized FROM allergens_reference",
      );
      const additivesResult = await db.query<Record<string, unknown>>(
        "SELECT code, label_localized FROM additives_reference",
      );

      return {
        items: itemsResult.rows
          .map(rowToItemRow)
          .map((row) => toPublicMenuItem(row, locale)),
        allergenReference: allergensResult.rows
          .map((row) => parseReferenceRow(row))
          .map((row) => ({ code: row.code, label: pickLocalized(row.label_localized, locale) })),
        additiveReference: additivesResult.rows
          .map((row) => parseReferenceRow(row))
          .map((row) => ({ code: row.code, label: pickLocalized(row.label_localized, locale) })),
      };
    },
  };
}
