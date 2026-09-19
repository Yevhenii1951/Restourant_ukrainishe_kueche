import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveHome } from "@/features/content/public";
import { parseSupportedLocale } from "@/features/seo/site";
import type { Metadata } from "next";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "home" });
  return buildPublicMetadata({
    locale: parseSupportedLocale(locale),
    path: "",
    title: translations("title"),
    description: translations("intro"),
  });
}


export default async function HomePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("home");
  const home = resolveHome(
    await getPublicContentEntries(),
    parseSupportedLocale(locale),
  );

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
        {home?.hero || translations("title")}
      </h1>
      <p className="max-w-2xl text-lg text-ink/80">
        {home?.storyTeaser || translations("intro")}
      </p>
    </section>
  );
}