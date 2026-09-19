import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveLunch } from "@/features/content/public";
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
    path: "/mittagstisch",
    title: t("lunchTitle"),
    description: t("lunchLead"),
  });
}

export default async function LunchPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("content");
  const lunch = resolveLunch(
    await getPublicContentEntries(),
    parseSupportedLocale(locale),
  );

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("lunchTitle")}</h1>
      <p className="text-ink/80">{t("lunchLead")}</p>
      {lunch ? (
        <div className="space-y-4">
          <p className="text-ink/80">{lunch.intro}</p>
          <p className="rounded-md border border-ink/10 bg-linen p-4 text-sm text-ink/70">
            {lunch.validFrom} – {lunch.validUntil}
          </p>
        </div>
      ) : (
        <p className="text-ink/60">{t("empty")}</p>
      )}
    </section>
  );
}