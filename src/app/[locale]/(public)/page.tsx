import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveHome } from "@/features/content/public";
import type { SupportedLocale } from "@/features/menu/domain";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const home = resolveHome(
    await getPublicContentEntries(),
    locale as SupportedLocale,
  );

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
        {home?.hero || t("title")}
      </h1>
      <p className="max-w-2xl text-lg text-ink/80">
        {home?.storyTeaser || t("intro")}
      </p>
    </section>
  );
}