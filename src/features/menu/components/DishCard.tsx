import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { formatEuroCents } from "@/lib/format";
import type { PublicMenuItem } from "../domain";

export default async function DishCard({
  item,
  locale,
}: Readonly<{ item: PublicMenuItem; locale: string }>) {
  const t = await getTranslations("menu");

  const flags = [
    { key: "popular", show: item.popular, label: t("popular") },
    { key: "vegetarian", show: item.vegetarian, label: t("vegetarian") },
    { key: "vegan", show: item.vegan, label: t("vegan") },
    { key: "spicy", show: item.spicy, label: t("spicy") },
    { key: "glutenFree", show: item.glutenFree, label: t("glutenFree") },
  ].filter((flag) => flag.show);

  const contains = item.allergens.filter((allergen) => allergen.containment === "contains");
  const mayContain = item.allergens.filter((allergen) => allergen.containment === "may_contain");

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-4 sm:flex-row sm:p-5">
      {item.image.storagePath ? (
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-36 sm:w-44">
          <Image
            src={item.image.storagePath}
            alt={item.image.alt ?? item.name}
            fill
            sizes="(max-width: 640px) 100vw, 176px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-display text-xl font-semibold">{item.name}</h3>
          <p className="font-semibold text-kalyna">
            {formatEuroCents(item.basePriceCents, locale)}
          </p>
        </div>
        {flags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {flags.map((flag) => (
              <li
                key={flag.key}
                className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium"
              >
                {flag.label}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-ink/75">{item.description}</p>
        <p className="text-sm font-medium text-ink/60">{item.portionLabel}</p>
        {item.allergens.length > 0 ? (
          <dl className="mt-1 space-y-1 text-sm text-ink/70">
            {contains.length > 0 ? (
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">{t("contains")}:</dt>
                <dd>{contains.map((allergen) => allergen.label).join(", ")}</dd>
              </div>
            ) : null}
            {mayContain.length > 0 ? (
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">{t("mayContain")}:</dt>
                <dd>{mayContain.map((allergen) => allergen.label).join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {item.additives.length > 0 ? (
          <p className="text-xs text-ink/55">
            {t("additives")}: {item.additives.map((additive) => additive.label).join(", ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}