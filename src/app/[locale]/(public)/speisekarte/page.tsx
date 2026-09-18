import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicMenu } from "@/features/menu/service";
import type { SupportedLocale } from "@/features/menu/domain";
import DishCard from "@/features/menu/components/DishCard";
import AllergenLegend from "@/features/menu/components/AllergenLegend";

export const dynamic = "force-dynamic";

export default async function SpeisekartePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("menu");
  const menu = await getPublicMenu(locale as SupportedLocale);

  const categories = new Map<string, { name: string; items: typeof menu.items }>();
  for (const item of menu.items) {
    const existing = categories.get(item.categoryId);
    if (existing) {
      existing.items.push(item);
    } else {
      categories.set(item.categoryId, { name: item.categoryName, items: [item] });
    }
  }

  return (
    <section className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg text-ink/75">{t("subtitle")}</p>
      </header>

      {menu.items.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-paper p-6 text-ink/70">
          {t("empty")}
        </p>
      ) : (
        [...categories.entries()].map(([categoryId, category]) => (
          <section key={categoryId} className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">{category.name}</h2>
            <div className="space-y-4">
              {category.items.map((item) => (
                <DishCard key={item.id} item={item} locale={locale} />
              ))}
            </div>
          </section>
        ))
      )}

      {menu.allergenReference.length > 0 || menu.additiveReference.length > 0 ? (
        <AllergenLegend menu={menu} />
      ) : null}
    </section>
  );
}