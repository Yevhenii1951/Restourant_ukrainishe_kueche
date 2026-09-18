import { getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import type { SupportedLocale } from "../domain";

interface MenuControlsProps {
  locale: string;
  searchParams: Record<string, string | undefined>;
  categories: { slug: string; name: string }[];
}

const DIETARY_FILTERS = [
  { param: "vegan", labelKey: "filterVegan" },
  { param: "vegetarisch", labelKey: "filterVegetarian" },
  { param: "scharf", labelKey: "filterSpicy" },
  { param: "beliebt", labelKey: "filterPopular" },
  { param: "glutenfrei", labelKey: "filterGlutenFree" },
] as const;

const KNOWN_PARAMS = new Set([
  "q",
  "kat",
  ...DIETARY_FILTERS.map((filter) => filter.param),
]);

export default async function MenuControls({
  locale,
  searchParams,
  categories,
}: Readonly<MenuControlsProps>) {
  const t = await getTranslations("menu");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && KNOWN_PARAMS.has(key)) params.set(key, value);
  }

  const formAction = getPathname({
    href: "/speisekarte",
    locale: locale as SupportedLocale,
  });

  function hrefWith(toggles: Record<string, string>): {
    pathname: string;
    query: Record<string, string>;
  } {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(toggles)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    return { pathname: "/speisekarte", query: Object.fromEntries(next) };
  }

  const activeChips: {
    label: string;
    remove: { pathname: string; query: Record<string, string> };
  }[] = [];
  const query = params.get("q") ?? "";
  if (query !== "") activeChips.push({ label: query, remove: hrefWith({ q: "" }) });
  const categorySlug = params.get("kat") ?? "";
  if (categorySlug !== "") {
    const categoryName = categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug;
    activeChips.push({ label: categoryName, remove: hrefWith({ kat: "" }) });
  }
  for (const filter of DIETARY_FILTERS) {
    if (params.get(filter.param) === "1") {
      activeChips.push({ label: t(filter.labelKey), remove: hrefWith({ [filter.param]: "" }) });
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex gap-2" role="search">
        <label className="sr-only" htmlFor="menu-search">
          {t("search")}
        </label>
        <input
          id="menu-search"
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-ink/20 bg-paper px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-kalyna px-4 py-2 text-sm font-medium text-paper">
          {t("search")}
        </button>
      </form>

      <nav aria-label={t("filters")} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink/70">{t("filters")}:</span>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={hrefWith({ kat: categorySlug === category.slug ? "" : category.slug })}
            className={`rounded-full border px-3 py-1 ${
              categorySlug === category.slug
                ? "border-kalyna bg-kalyna text-paper"
                : "border-ink/20 text-ink/80"
            }`}
          >
            {category.name}
          </Link>
        ))}
        {DIETARY_FILTERS.map((filter) => {
          const active = params.get(filter.param) === "1";
          return (
            <Link
              key={filter.param}
              href={hrefWith({ [filter.param]: active ? "" : "1" })}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 ${
                active ? "border-kalyna bg-kalyna text-paper" : "border-ink/20 text-ink/80"
              }`}
            >
              {t(filter.labelKey)}
            </Link>
          );
        })}
      </nav>

      {activeChips.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2 text-sm" aria-label={t("activeFilters")}>
          {activeChips.map((chip) => (
            <li key={chip.label} className="flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1">
              <span>{chip.label}</span>
              <Link href={chip.remove} aria-label={`${t("removeFilter")}: ${chip.label}`}>
                &times;
              </Link>
            </li>
          ))}
          <li>
            <Link href="/speisekarte" className="font-medium text-kalyna underline">
              {t("clearFilters")}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}