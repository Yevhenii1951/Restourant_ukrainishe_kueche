import { getTranslations } from "next-intl/server";
import type { PublicMenu } from "../domain";

export default async function AllergenLegend({ menu }: Readonly<{ menu: PublicMenu }>) {
  const t = await getTranslations("menu");

  return (
    <section className="mt-12 rounded-2xl border border-ink/10 bg-paper p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">{t("legendTitle")}</h2>
      <p className="mt-2 text-sm text-ink/70">{t("allergenNote")}</p>
      {menu.allergenReference.length > 0 ? (
        <>
          <h3 className="mt-5 text-sm font-semibold text-ink/80">{t("allergens")}</h3>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink/75 sm:grid-cols-2">
            {menu.allergenReference.map((allergen) => (
              <li key={allergen.code}>{allergen.label}</li>
            ))}
          </ul>
        </>
      ) : null}
      {menu.additiveReference.length > 0 ? (
        <>
          <h3 className="mt-5 text-sm font-semibold text-ink/80">{t("additives")}</h3>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink/75 sm:grid-cols-2">
            {menu.additiveReference.map((additive) => (
              <li key={additive.code}>{additive.label}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}