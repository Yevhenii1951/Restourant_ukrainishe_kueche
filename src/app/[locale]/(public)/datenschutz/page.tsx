import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import LegalDraft from "@/features/contact/components/LegalDraft";
import { parseSupportedLocale } from "@/features/seo/site";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "contactLegal" });
  return buildPublicMetadata({ locale: parseSupportedLocale(locale), path: "/datenschutz", title: translations("privacyTitle"), description: translations("legalWarning") });
}

export default async function PrivacyPage({ params }: Readonly<{ params: Promise<{ locale: string }> }>): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("contactLegal");
  return (
    <LegalDraft title={translations("privacyTitle")} warning={translations("legalWarning")}>
      <section><h2 className="text-xl font-semibold">Aktueller Demo-Stand</h2><p>Ohne Karten-Zustimmung werden keine Kartenkacheln geladen. Die externe Routenplanung öffnet sich nur nach einem Klick. Analyse-Tracking ist nicht aktiviert.</p></section>
      <section><h2 className="text-xl font-semibold">Technisch notwendige Daten</h2><p>Lokalisierung und später der Warenkorb dürfen technisch notwendige Einstellungen ohne Werbe-Tracking speichern. Die Demo verlangt kein Kundenkonto.</p></section>
      <section><h2 className="text-xl font-semibold">Vor dem realen Betrieb</h2><p>Verantwortlicher, Auftragsverarbeiter, Rechtsgrundlagen, Empfänger, Übermittlungen, konkrete Speicherfristen und Betroffenenrechte müssen anhand der tatsächlichen Konfiguration geprüft und ergänzt werden.</p></section>
    </LegalDraft>
  );
}
