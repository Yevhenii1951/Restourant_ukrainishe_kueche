import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { parseSupportedLocale } from "@/features/seo/site";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";
import MeineAnfragenForm from "@/features/guest/components/MeineAnfragenForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meineAnfragen" });
  return buildPublicMetadata({
    locale: parseSupportedLocale(locale),
    path: "/meine-anfragen",
    title: t("title"),
    description: t("lead"),
  });
}

export default async function MeineAnfragenPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meineAnfragen");

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-ink/70">{t("lead")}</p>
      </div>
      <MeineAnfragenForm />
    </section>
  );
}