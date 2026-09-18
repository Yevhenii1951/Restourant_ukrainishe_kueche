import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MENU_ITEM_ROW_SCHEMA,
  pickLocalized,
  toPublicMenuItem,
  type PublicMenu,
  type SupportedLocale,
} from "./domain";
import { parseReferenceRow, type MenuStore } from "./store";

type MenuItemApiRow = Record<string, unknown> & {
  id: string;
  slug: string;
};

export function createSupabaseMenuStore(db: SupabaseClient): MenuStore {
  return {
    async listPublicMenu(locale: SupportedLocale): Promise<PublicMenu> {
      const itemsResult = await db
        .from("menu_items_public")
        .select(
          "id, slug, category_id, category_slug, category_name_localized, name_localized, description_localized, portion_label_localized, base_price_cents, gluten_free, vegan, vegetarian, spicy, popular, sort_order, category_sort_order, allergens, additives, image_storage_path, image_alt_localized, image_mime",
        );
      if (itemsResult.error) throw itemsResult.error;

      const allergensResult = await db
        .from("allergens_reference")
        .select("code, label_localized");
      if (allergensResult.error) throw allergensResult.error;

      const additivesResult = await db
        .from("additives_reference")
        .select("code, label_localized");
      if (additivesResult.error) throw additivesResult.error;

      const items = ((itemsResult.data ?? []) as MenuItemApiRow[]).map((row) =>
        toPublicMenuItem(MENU_ITEM_ROW_SCHEMA.parse(row), locale),
      );

      return {
        items,
        allergenReference: ((allergensResult.data ?? []) as Record<string, unknown>[])
          .map((row) => parseReferenceRow(row))
          .map((row) => ({ code: row.code, label: pickLocalized(row.label_localized, locale) })),
        additiveReference: ((additivesResult.data ?? []) as Record<string, unknown>[])
          .map((row) => parseReferenceRow(row))
          .map((row) => ({ code: row.code, label: pickLocalized(row.label_localized, locale) })),
      };
    },
  };
}