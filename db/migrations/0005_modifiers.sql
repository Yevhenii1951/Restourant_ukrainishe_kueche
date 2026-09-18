-- Modifier groups/options with enforced min/max boundaries and safe public views.
-- Groups belong to items; options carry server-defined price deltas in euro cents.

CREATE TABLE modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name_localized jsonb NOT NULL CHECK (name_localized ? 'de'),
  min_selections integer NOT NULL CHECK (min_selections >= 0),
  max_selections integer NOT NULL CHECK (max_selections >= min_selections),
  required boolean NOT NULL CHECK (required = (min_selections > 0)),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name_localized jsonb NOT NULL CHECK (name_localized ? 'de'),
  price_delta_cents integer NOT NULL CHECK (price_delta_cents >= 0),
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX modifier_groups_item_idx ON modifier_groups (menu_item_id, sort_order);
CREATE INDEX modifier_options_group_idx ON modifier_options (group_id, sort_order);

ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON modifier_groups, modifier_options FROM anon, authenticated;
GRANT ALL ON modifier_groups, modifier_options TO service_role;

-- Public projection: only groups/options of published, available items.
CREATE VIEW modifier_groups_public AS
SELECT
  g.id,
  g.menu_item_id,
  g.name_localized,
  g.min_selections,
  g.max_selections,
  g.required,
  g.sort_order,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'id', o.id,
         'name_localized', o.name_localized,
         'price_delta_cents', o.price_delta_cents,
         'sort_order', o.sort_order
       )
       ORDER BY o.sort_order, o.name_localized ->> 'de')
     FROM modifier_options o
     WHERE o.group_id = g.id AND o.available = true),
    '[]'::jsonb
  ) AS options
FROM modifier_groups g
JOIN menu_items mi ON mi.id = g.menu_item_id
WHERE mi.publication_state = 'published'
  AND mi.availability_state = 'available';

GRANT SELECT ON modifier_groups_public TO anon, authenticated, service_role;

-- Extend the public menu projection with the item's modifier groups.
CREATE OR REPLACE VIEW menu_items_public AS
SELECT
  mi.id,
  mi.slug,
  mi.category_id,
  c.slug AS category_slug,
  c.name_localized AS category_name_localized,
  c.sort_order AS category_sort_order,
  mi.name_localized,
  mi.description_localized,
  mi.portion_label_localized,
  mi.base_price_cents,
  mi.gluten_free,
  mi.vegan,
  mi.vegetarian,
  mi.spicy,
  mi.popular,
  mi.sort_order,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'code', a.code,
         'label_localized', a.label_localized,
         'containment', mia.containment
       )
       ORDER BY a.code)
     FROM menu_item_allergens mia
     JOIN allergens a ON a.code = mia.allergen_code
     WHERE mia.menu_item_id = mi.id),
    '[]'::jsonb
  ) AS allergens,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'code', ad.code,
         'label_localized', ad.label_localized
       )
       ORDER BY ad.code)
     FROM menu_item_additives mia2
     JOIN additives ad ON ad.code = mia2.additive_code
     WHERE mia2.menu_item_id = mi.id),
    '[]'::jsonb
  ) AS additives,
  m.storage_path AS image_storage_path,
  m.mime AS image_mime,
  m.alt_localized AS image_alt_localized,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'id', g.id,
         'menu_item_id', g.menu_item_id,
         'name_localized', g.name_localized,
         'min_selections', g.min_selections,
         'max_selections', g.max_selections,
         'required', g.required,
         'sort_order', g.sort_order,
         'options', g.options
       )
       ORDER BY g.sort_order)
     FROM modifier_groups_public g
     WHERE g.menu_item_id = mi.id),
    '[]'::jsonb
  ) AS modifier_groups
FROM menu_items mi
JOIN categories c ON c.id = mi.category_id
LEFT JOIN media_assets m ON m.id = mi.image_id
WHERE c.publication_state = 'published'
  AND mi.publication_state = 'published'
  AND mi.availability_state = 'available'
ORDER BY c.sort_order, mi.sort_order;