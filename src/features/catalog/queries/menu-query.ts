import { PublicDish } from "./menu-view";

export function queryPublicMenu(): PublicDish[] {
  // Placeholder: database-backed query will replace this after migration.
  return [
    {
      id: "d-001",
      name: "Borschtsch",
      description: "Traditionelle rote Rübensuppe mit Dill und saurer Sahne.",
      priceCents: 850,
      allergens: ["Milch", "Sellerie"],
      available: true,
      published: true,
      imageAlt: "Schüssel Borschtsch mit Dill und Sahne",
    },
  ];
}
