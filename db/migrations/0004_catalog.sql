-- Catalog, allergen/additive reference and the safe public projection.
-- anon/authenticated may read only the curated views; service_role owns catalog writes.
-- All RLS policies are absent by design: no direct data-api table access.

CREATE TABLE allergens (
  code text PRIMARY KEY,
  label_localized jsonb NOT NULL CHECK (label_localized ? 'de')
);

CREATE TABLE additives (
  code text PRIMARY KEY,
  label_localized jsonb NOT NULL CHECK (label_localized ? 'de')
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  mime text NOT NULL,
  alt_localized jsonb NOT NULL CHECK (alt_localized ? 'de'),
  license_status text NOT NULL DEFAULT 'unverified'
    CHECK (license_status IN ('verified', 'unverified')),
  license_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_localized jsonb NOT NULL CHECK (name_localized ? 'de'),
  sort_order integer NOT NULL DEFAULT 0,
  publication_state text NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id),
  slug text NOT NULL UNIQUE,
  name_localized jsonb NOT NULL CHECK (name_localized ? 'de'),
  description_localized jsonb NOT NULL CHECK (description_localized ? 'de'),
  portion_label_localized jsonb NOT NULL CHECK (portion_label_localized ? 'de'),
  base_price_cents integer NOT NULL CHECK (base_price_cents >= 0),
  gluten_free boolean NOT NULL DEFAULT false,
  vegan boolean NOT NULL DEFAULT false,
  vegetarian boolean NOT NULL DEFAULT false,
  spicy boolean NOT NULL DEFAULT false,
  popular boolean NOT NULL DEFAULT false,
  allergen_reviewed boolean NOT NULL DEFAULT false,
  publication_state text NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft', 'published', 'archived')),
  availability_state text NOT NULL DEFAULT 'available'
    CHECK (availability_state IN ('available', 'sold_out', 'unavailable')),
  sort_order integer NOT NULL DEFAULT 0,
  image_id uuid REFERENCES media_assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menu_item_allergens (
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  allergen_code text NOT NULL REFERENCES allergens(code),
  containment text NOT NULL CHECK (containment IN ('contains', 'may_contain')),
  PRIMARY KEY (menu_item_id, allergen_code)
);

CREATE TABLE menu_item_additives (
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  additive_code text NOT NULL REFERENCES additives(code),
  PRIMARY KEY (menu_item_id, additive_code)
);

CREATE INDEX menu_items_active_idx
  ON menu_items (publication_state, availability_state, category_id, sort_order);
CREATE INDEX categories_public_idx ON categories (publication_state, sort_order);

ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE additives ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_additives ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON allergens, additives, media_assets, categories, menu_items,
  menu_item_allergens, menu_item_additives FROM anon, authenticated;
GRANT ALL ON allergens, additives, media_assets, categories, menu_items,
  menu_item_allergens, menu_item_additives TO service_role;

-- Publication requires an explicit allergen review; a reviewed empty list is valid.
CREATE FUNCTION enforce_menu_publish_readiness()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.publication_state = 'published' AND NOT NEW.allergen_reviewed THEN
    RAISE EXCEPTION 'cannot publish menu item without allergen review';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER menu_items_publish_readiness
BEFORE UPDATE OF publication_state ON menu_items
FOR EACH ROW EXECUTE FUNCTION enforce_menu_publish_readiness();

-- Curated public projection: published category + published/available item only.
CREATE VIEW menu_items_public AS
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
  m.alt_localized AS image_alt_localized
FROM menu_items mi
JOIN categories c ON c.id = mi.category_id
LEFT JOIN media_assets m ON m.id = mi.image_id
WHERE c.publication_state = 'published'
  AND mi.publication_state = 'published'
  AND mi.availability_state = 'available'
ORDER BY c.sort_order, mi.sort_order;

CREATE VIEW allergens_reference AS
SELECT code, label_localized FROM allergens ORDER BY code;

CREATE VIEW additives_reference AS
SELECT code, label_localized FROM additives ORDER BY code;

GRANT SELECT ON menu_items_public, allergens_reference, additives_reference
  TO anon, authenticated, service_role;