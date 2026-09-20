INSERT INTO voucher_products (denomination_cents, name_de, name_en, name_uk, sort_order, active) VALUES
  (2500, 'Kalyna Gutschein 25 EUR', 'Kalyna voucher EUR 25', 'Подарунковий сертифікат Kalyna 25 EUR', 1, true),
  (5000, 'Kalyna Gutschein 50 EUR', 'Kalyna voucher EUR 50', 'Подарунковий сертифікат Kalyna 50 EUR', 2, true),
  (10000, 'Kalyna Gutschein 100 EUR', 'Kalyna voucher EUR 100', 'Подарунковий сертифікат Kalyna 100 EUR', 3, true)
ON CONFLICT (denomination_cents) DO UPDATE
SET name_de = EXCLUDED.name_de,
    name_en = EXCLUDED.name_en,
    name_uk = EXCLUDED.name_uk,
    sort_order = EXCLUDED.sort_order,
    active = EXCLUDED.active;
