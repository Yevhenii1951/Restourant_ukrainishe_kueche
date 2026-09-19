import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicMenu } from "@/features/menu/service";
import { filterMenuItems } from "@/features/menu/domain";
import DishCard from "@/features/menu/components/DishCard";
import AllergenLegend from "@/features/menu/components/AllergenLegend";
import MenuControls from "@/features/menu/components/MenuControls";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";
import { parseSupportedLocale } from "@/features/seo/site";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;
type NormalizedSearchParams = Record<string, string | undefined>;

function normalizeSearchParams(params: RawSearchParams): NormalizedSearchParams {
  const normalized: NormalizedSearchParams = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  return normalized;
}

const FILTER_PARAM_KEYS = ["q", "kat", "vegan", "vegetarisch", "scharf", "beliebt", "glutenfrei"];

function hasActiveFilters(searchParams: NormalizedSearchParams): boolean {
  return FILTER_PARAM_KEYS.some((key) => searchParams[key] !== undefined);
}

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}>): Promise<Metadata> {
  const { locale } = await params;
  const queryParams = normalizeSearchParams(await searchParams);
  const translations = await getTranslations({ locale, namespace: "menu" });
  return {
    ...buildPublicMetadata({
      locale: parseSupportedLocale(locale),
      path: "/speisekarte",
      title: translations("title"),
      description: translations("subtitle"),
    }),
    robots: { index: !hasActiveFilters(queryParams), follow: true },
  };
}

export default async function SpeisekartePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}>) {
  const { locale } = await params;
  const queryParams = normalizeSearchParams(await searchParams);
  setRequestLocale(locale);
  const translations = await getTranslations("menu");
  const menu = await getPublicMenu(parseSupportedLocale(locale));

  const filter = {
    query: queryParams.q ?? "",
    categorySlug: queryParams.kat,
    vegan: queryParams.vegan === "1",
    vegetarian: queryParams.vegetarisch === "1",
    spicy: queryParams.scharf === "1",
    popular: queryParams.beliebt === "1",
    glutenFree: queryParams.glutenfrei === "1",
  };
  const visibleItems = filterMenuItems(menu.items, filter);

  const categories = Array.from(
    new Map(menu.items.map((item) => [item.categorySlug, item.categoryName])).entries(),
  ).map(([slug, name]) => ({ slug, name }));

  const groups = new Map<string, { name: string; items: typeof visibleItems }>();
  for (const item of visibleItems) {
    const existing = groups.get(item.categoryId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.categoryId, { name: item.categoryName, items: [item] });
    }
  }

  return (
    <section className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
          {translations("title")}
        </h1>
        <p className="text-lg text-ink/75">{translations("subtitle")}</p>
      </header>

      <MenuControls locale={locale} searchParams={queryParams} categories={categories} />

      <p className="text-sm text-ink/60" role="status">
        {translations("resultCount", { count: visibleItems.length })}
      </p>

      {visibleItems.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-paper p-6 text-ink/70">
          {translations("noResults")}
        </p>
      ) : (
        [...groups.entries()].map(([categoryId, category]) => (
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