import { queryPublicMenu } from "@/features/catalog/queries/menu-query";

export default function MenuPage() {
  const dishes = queryPublicMenu();
  return (
    <section>
      <h1 className="text-3xl font-bold">Speisekarte</h1>
      <ul className="mt-6 space-y-6">
        {dishes.map((d) => (
          <li key={d.id} className="border border-stone-200 rounded-lg p-4">
            <h3 className="text-xl font-semibold">{d.name}</h3>
            <p className="text-sm text-stone-600">{d.description}</p>
            <p className="text-sm font-medium mt-2">{(d.priceCents / 100).toFixed(2)} EUR</p>
            <p className="text-xs text-stone-400 mt-1">Allergene: {d.allergens.join(", ") || "Keine deklariert"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
