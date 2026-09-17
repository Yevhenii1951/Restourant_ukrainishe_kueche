import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">{t("title")}</h1>
      <p className="max-w-2xl text-lg text-ink/80">{t("intro")}</p>
    </section>
  );
}