import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicMenu } from "@/features/menu/service";
import WarenkorbClient from "@/features/cart/components/WarenkorbClient";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";
import { parseSupportedLocale } from "@/features/seo/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "cart" });
  return buildPublicMetadata({
    locale: parseSupportedLocale(locale),
    path: "/warenkorb",
    title: translations("title"),
    description: translations("description"),
  });
}

export default async function WarenkorbPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("cart");
  const menu = await getPublicMenu(parseSupportedLocale(locale));

  return (
    <section className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
          {translations("title")}
        </h1>
        <p className="text-lg text-ink/75">{translations("description")}</p>
      </header>
      <WarenkorbClient items={menu.items} locale={locale} />
    </section>
  );
}