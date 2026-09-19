import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveAbout } from "@/features/content/public";
import { parseSupportedLocale } from "@/features/seo/site";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return buildPublicMetadata({
    locale: parseSupportedLocale(locale),
    path: "/ueber-uns",
    title: t("aboutTitle"),
    description: t("aboutLead"),
  });
}

export default async function UeberUnsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("content");
  const about = resolveAbout(
    await getPublicContentEntries(),
    parseSupportedLocale(locale),
  );

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("aboutTitle")}</h1>
      <p className="text-ink/80">{t("aboutLead")}</p>
      {about ? (
        <div className="space-y-4">
          <h2 className="text-xl font-medium text-ink">{about.intro}</h2>
          <p className="text-ink/80">{about.story}</p>
        </div>
      ) : (
        <p className="text-ink/60">{t("empty")}</p>
      )}
    </section>
  );
}