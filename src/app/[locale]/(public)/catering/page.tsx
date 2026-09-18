import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveCatering } from "@/features/content/public";
import type { SupportedLocale } from "@/features/menu/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return { title: t("cateringTitle"), description: t("cateringLead") };
}

export default async function CateringPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("content");
  const catering = resolveCatering(
    await getPublicContentEntries(),
    locale as SupportedLocale,
  );

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("cateringTitle")}</h1>
      <p className="text-ink/80">{t("cateringLead")}</p>
      {catering ? (
        <div className="space-y-4">
          <p className="text-ink/80">{catering.intro}</p>
          <p className="text-ink/80">{catering.constraints}</p>
          <p className="rounded-md border border-ink/10 bg-linen p-4 text-sm text-ink/70">
            {catering.responseNote}
          </p>
        </div>
      ) : (
        <p className="text-ink/60">{t("empty")}</p>
      )}
    </section>
  );
}