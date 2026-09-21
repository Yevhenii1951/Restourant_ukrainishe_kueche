import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveHome } from "@/features/content/public";
import { getPublicMenu } from "@/features/menu/service";
import { formatEuroCents } from "@/lib/format";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";
import { parseSupportedLocale } from "@/features/seo/site";

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
  const [entries, menu] = await Promise.all([
    getPublicContentEntries(),
    getPublicMenu(supportedLocale),
  ]);
  const home = resolveHome(entries, supportedLocale);
  const featuredItems = menu.items
    .filter((item) => item.image.storagePath)
    .slice(0, 3);

  return (
    <section className="space-y-10">
      <div className="relative min-h-[28rem] overflow-hidden rounded-md border border-ink/10 bg-ink text-white">
        <Image
          src="/hero_ukrainian-food-7323773_1920.jpg"
          alt="Ukrainian dishes on a table"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-ink/35" />
        <div className="relative flex min-h-[28rem] max-w-2xl flex-col justify-end gap-4 p-6 sm:p-10">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            {home?.hero || translations("title")}
          </h1>
          <p className="text-lg text-white/90">
            {home?.storyTeaser || translations("intro")}
          </p>
          <Link
            href={`/${locale}/speisekarte`}
            className="inline-flex min-h-11 w-fit items-center rounded-md bg-kalyna px-4 py-2 font-medium text-white"
          >
            {translations("menuCta")}
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-display text-3xl font-semibold">
            {translations("featuredTitle")}
          </h2>
          <p className="text-ink/75">{translations("featuredLead")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {featuredItems.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-md border border-ink/10 bg-paper"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.image.storagePath ?? "/2borsch.jpg"}
                  alt={item.image.alt ?? item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold">
                    {item.name}
                  </h3>
                  <p className="shrink-0 font-semibold text-kalyna">
                    {formatEuroCents(item.basePriceCents, locale)}
                  </p>
                </div>
                <p className="text-sm text-ink/75">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
