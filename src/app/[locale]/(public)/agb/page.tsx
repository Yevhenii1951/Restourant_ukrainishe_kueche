import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalDraft from "@/features/contact/components/LegalDraft";
import { parseSupportedLocale } from "@/features/seo/site";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "contactLegal" });
  return buildPublicMetadata({ locale: parseSupportedLocale(locale), path: "/agb", title: translations("termsTitle"), description: translations("legalWarning") });
}

export default async function TermsPage({ params }: Readonly<{ params: Promise<{ locale: string }> }>): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("contactLegal");
  return (
    <LegalDraft title={translations("termsTitle")} warning={translations("legalWarning")}>
      <p>Diese Seite ist kein verwendbarer Vertragstext. Die Demo nimmt keine realen Bestellungen, Reservierungen, Zahlungen oder Gutscheinkäufe an.</p>
      <p>Regeln zu Vertragsschluss, Restaurantbestätigung, Lieferung, Abholung, Stornierung, Erstattung und Verbraucherinformationen müssen vor einem realen Betrieb professionell geprüft werden.</p>
    </LegalDraft>
  );
}
