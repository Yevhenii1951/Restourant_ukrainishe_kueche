import type { PublicMenu, PublicMenuItem } from "./domain";

function demoItem(
  item: Omit<
    PublicMenuItem,
    "allergens" | "additives" | "modifierGroups" | "searchText"
  > & {
    allergens?: PublicMenuItem["allergens"];
  },
): PublicMenuItem {
  return {
    ...item,
    allergens: item.allergens ?? [],
    additives: [],
    modifierGroups: [],
    searchText: `${item.name} ${item.description}`.toLowerCase(),
  };
}

const ITEMS: PublicMenuItem[] = [
  demoItem({
    id: "30000000-0000-0000-0000-000000000001",
    slug: "borschtsch",
    categoryId: "10000000-0000-0000-0000-000000000001",
    categorySlug: "suppen",
    categoryName: "Suppen",
    name: "Borschtsch",
    description: "Ukrainische Rote-Bete-Suppe mit Sauerrahm und frischem Dill.",
    portionLabel: "Portion - 450 ml",
    basePriceCents: 790,
    glutenFree: false,
    vegan: false,
    vegetarian: false,
    spicy: false,
    popular: true,
    image: {
      storagePath: "/2borsch.jpg",
      alt: "Borschtsch mit Sauerrahm und Dill",
    },
    sortOrder: 1,
    categorySortOrder: 1,
    allergens: [
      { code: "milk", label: "Milch", containment: "contains" },
      { code: "celery", label: "Sellerie", containment: "contains" },
    ],
  }),
  demoItem({
    id: "30000000-0000-0000-0000-000000000003",
    slug: "wareniki-kartoffeln",
    categoryId: "10000000-0000-0000-0000-000000000002",
    categorySlug: "hauptgerichte",
    categoryName: "Hauptgerichte",
    name: "Wareniki mit Kartoffeln",
    description:
      "Ukrainische Teigtaschen mit Kartoffelfuellung und Roestzwiebeln.",
    portionLabel: "Portion - 8 Stueck",
    basePriceCents: 990,
    glutenFree: false,
    vegan: false,
    vegetarian: true,
    spicy: false,
    popular: true,
    image: { storagePath: "/vareniki1.jpg", alt: "Wareniki mit Kartoffeln" },
    sortOrder: 1,
    categorySortOrder: 2,
    allergens: [
      { code: "gluten", label: "Gluten", containment: "contains" },
      { code: "eggs", label: "Eier", containment: "contains" },
      { code: "milk", label: "Milch", containment: "contains" },
    ],
  }),
  demoItem({
    id: "30000000-0000-0000-0000-000000000005",
    slug: "deruny",
    categoryId: "10000000-0000-0000-0000-000000000002",
    categorySlug: "hauptgerichte",
    categoryName: "Hauptgerichte",
    name: "Deruny",
    description: "Kartoffelpuffer mit Sauerrahm und frischem Dill.",
    portionLabel: "Portion - 4 Stueck",
    basePriceCents: 850,
    glutenFree: false,
    vegan: false,
    vegetarian: true,
    spicy: false,
    popular: true,
    image: { storagePath: "/deruni1.jpg", alt: "Deruny mit Sauerrahm" },
    sortOrder: 2,
    categorySortOrder: 2,
    allergens: [
      { code: "gluten", label: "Gluten", containment: "contains" },
      { code: "eggs", label: "Eier", containment: "contains" },
      { code: "milk", label: "Milch", containment: "contains" },
    ],
  }),
  demoItem({
    id: "30000000-0000-0000-0000-000000000006",
    slug: "kiewer-kotelett",
    categoryId: "10000000-0000-0000-0000-000000000002",
    categorySlug: "hauptgerichte",
    categoryName: "Hauptgerichte",
    name: "Kiewer Kotelett",
    description:
      "Haehnchenkotelett mit Kraeuterbutter, paniert und goldbraun gebraten.",
    portionLabel: "Portion - 2 Stueck",
    basePriceCents: 1390,
    glutenFree: false,
    vegan: false,
    vegetarian: false,
    spicy: false,
    popular: true,
    image: {
      storagePath: "/kotleta_po_Kievski1.jpg",
      alt: "Paniertes Kiewer Kotelett",
    },
    sortOrder: 3,
    categorySortOrder: 2,
    allergens: [
      { code: "gluten", label: "Gluten", containment: "contains" },
      { code: "eggs", label: "Eier", containment: "contains" },
      { code: "milk", label: "Milch", containment: "contains" },
    ],
  }),
  demoItem({
    id: "30000000-0000-0000-0000-000000000008",
    slug: "holubzi",
    categoryId: "10000000-0000-0000-0000-000000000002",
    categorySlug: "hauptgerichte",
    categoryName: "Hauptgerichte",
    name: "Holubzi",
    description: "Kohlrouladen mit Reis und Hackfleisch in Tomatensauce.",
    portionLabel: "Portion - 3 Stueck",
    basePriceCents: 1190,
    glutenFree: false,
    vegan: false,
    vegetarian: false,
    spicy: false,
    popular: false,
    image: { storagePath: "/golubtsi1.jpg", alt: "Holubzi in Tomatensauce" },
    sortOrder: 5,
    categorySortOrder: 2,
    allergens: [{ code: "celery", label: "Sellerie", containment: "contains" }],
  }),
  demoItem({
    id: "30000000-0000-0000-0000-00000000000b",
    slug: "uzvar",
    categoryId: "10000000-0000-0000-0000-000000000005",
    categorySlug: "getraenke",
    categoryName: "Getraenke",
    name: "Uzvar",
    description: "Ukrainisches Kompott aus getrockneten Fruechten.",
    portionLabel: "Portion - 0,33 l",
    basePriceCents: 350,
    glutenFree: false,
    vegan: true,
    vegetarian: true,
    spicy: false,
    popular: false,
    image: {
      storagePath: "/uzvar1.jpg",
      alt: "Uzvar aus getrockneten Fruechten",
    },
    sortOrder: 1,
    categorySortOrder: 5,
  }),
];

export function getDemoPublicMenu(): PublicMenu {
  return {
    items: ITEMS,
    allergenReference: [
      { code: "gluten", label: "Gluten" },
      { code: "eggs", label: "Eier" },
      { code: "milk", label: "Milch" },
      { code: "celery", label: "Sellerie" },
    ],
    additiveReference: [],
  };
}

export function withDemoMenuFallback(menu: PublicMenu): PublicMenu {
  return menu.items.length > 0 ? menu : getDemoPublicMenu();
}
