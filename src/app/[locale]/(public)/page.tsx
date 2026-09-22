import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveHome, resolveLunch } from "@/features/content/public";
import { getPublicMenu } from "@/features/menu/service";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";
import { parseSupportedLocale } from "@/features/seo/site";
import HomeHero from "@/features/content/components/home/HomeHero";
import HomeSteps from "@/features/content/components/home/HomeSteps";
import HomeFeatured from "@/features/content/components/home/HomeFeatured";
import HomeOffer from "@/features/content/components/home/HomeOffer";
import HomeServices from "@/features/content/components/home/HomeServices";
import HomeCta from "@/features/content/components/home/HomeCta";

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
  const supportedLocale = parseSupportedLocale(locale);
  setRequestLocale(locale);
  const translations = await getTranslations("home");
  const content = await getTranslations("content");
  const [entries, menu] = await Promise.all([
    getPublicContentEntries(),
    getPublicMenu(supportedLocale),
  ]);
  const home = resolveHome(entries, supportedLocale);
  const lunch = resolveLunch(entries, supportedLocale);
  const featuredItems = menu.items
    .filter((item) => item.image.storagePath)
    .slice(0, 3);

  return (
    <div className="flex flex-col -mt-8 sm:-mt-12">
      <HomeHero
        title={home?.hero || translations("title")}
        lead={home?.storyTeaser || translations("intro")}
        menuCount={menu.items.length}
      />
      <HomeSteps />
      <HomeFeatured items={featuredItems} locale={supportedLocale} />
      <HomeOffer
        title={content("lunchTitle")}
        lead={lunch?.intro || content("lunchLead")}
      />
      <HomeServices />
      <HomeCta />
    </div>
  );
}