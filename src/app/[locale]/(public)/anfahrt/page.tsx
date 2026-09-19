import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseSupportedLocale } from "@/features/seo/site";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";

const DIRECTIONS_URL = "https://www.openstreetmap.org/directions?to=51.3127%2C9.4797";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "contactLegal" });
  return buildPublicMetadata({
    locale: parseSupportedLocale(locale),
    path: "/anfahrt",
    title: translations("directionsTitle"),
    description: translations("directionsLead"),
  });
}

export default async function DirectionsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("contactLegal");

  return (
    <section className="max-w-2xl space-y-6">
      <h1 className="font-display text-4xl font-semibold">{translations("directionsTitle")}</h1>
      <p className="text-lg text-ink/75">{translations("directionsLead")}</p>
      <div className="space-y-3 rounded-2xl border border-ink/10 bg-paper p-6">
        <p className="font-medium">{translations("address")}</p>
        <p>Tram- und Busverbindungen sowie Barrierefreiheit sind für diese Demo nicht verifiziert.</p>
        <a
          className="inline-flex min-h-11 items-center rounded-lg bg-kalyna px-4 py-2 font-medium text-white"
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noreferrer"
        >
          {translations("openDirections")}
        </a>
      </div>
    </section>
  );
}
