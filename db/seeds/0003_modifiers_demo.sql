-- Demo modifiers: one required 1-of-2 group, one optional group, and one
-- group on an archived item to prove it stays hidden from the public view.

INSERT INTO modifier_groups
  (id, menu_item_id, name_localized, min_selections, max_selections, required, sort_order)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   (SELECT id FROM menu_items WHERE slug = 'kiewer-kotelett'),
   '{"de":"Beilage","en":"Side dish","uk":"Гарнір"}', 1, 1, true, 1),
  ('40000000-0000-0000-0000-000000000002',
   (SELECT id FROM menu_items WHERE slug = 'borschtsch'),
   '{"de":"Extras","en":"Extras","uk":"Додатки"}', 0, 1, false, 1),
  ('40000000-0000-0000-0000-000000000003',
   (SELECT id FROM menu_items WHERE slug = 'kwas'),
   '{"de":"Mit Sahne","en":"With cream","uk":"Зі сметаною"}', 0, 1, false, 1);

INSERT INTO modifier_options
  (id, group_id, name_localized, price_delta_cents, sort_order)
VALUES
  ('50000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   '{"de":"Kartoffeln","en":"Potatoes","uk":"Картопля"}', 0, 1),
  ('50000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   '{"de":"Pommes frites","en":"French fries","uk":"Картопля фрі"}', 150, 2),
  ('50000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000002',
   '{"de":"Pampuschky (2 Stück)","en":"Pampushky (2 pieces)","uk":"Пампушки (2 шт.)"}', 250, 1),
  ('50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000003',
   '{"de":"Sahne","en":"Cream","uk":"Сметана"}', 0, 1);