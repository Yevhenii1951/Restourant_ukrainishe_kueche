import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "leaflet/dist/leaflet.css";
import ConsentMap from "@/features/contact/components/ConsentMap";
import { getPublicOpeningHours } from "@/features/contact/openingHours";
import { parseSupportedLocale } from "@/features/seo/site";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";
import { buildRestaurantJsonLd } from "@/features/seo/restaurantJsonLd";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations({ locale, namespace: "contactLegal" });
  return buildPublicMetadata({
    locale: parseSupportedLocale(locale),
    path: "/kontakt",
    title: translations("contactTitle"),
    description: translations("contactLead"),
  });
}

export default async function ContactPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const translations = await getTranslations("contactLegal");
  const jsonLd = buildRestaurantJsonLd(parseSupportedLocale(locale));
  const structuredData = { __html: JSON.stringify(jsonLd) };
  const openingHours = getPublicOpeningHours();

  return (
    <section className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={structuredData}
      />
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">{translations("contactTitle")}</h1>
        <p className="text-lg text-ink/75">{translations("contactLead")}</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-ink/10 bg-paper p-6">
          <h2 className="font-display text-2xl font-semibold">Kontakt</h2>
          <address className="space-y-2 not-italic text-ink/80">
            <p>{translations("address")}</p>
            <p>{translations("phone")}</p>
            <a className="underline" href="mailto:hallo@kalyna-demo.example">
              {translations("email")}
            </a>
          </address>
          <Link className="inline-block font-medium text-kalyna underline" href="/anfahrt">
            {translations("directionsTitle")}
          </Link>
        </section>

        <section className="space-y-3 rounded-2xl border border-ink/10 bg-paper p-6">
          <h2 className="font-display text-2xl font-semibold">{translations("hoursTitle")}</h2>
          <ul className="space-y-1 text-ink/80">
            {openingHours.map((entry) => (
              <li key={entry.label}>
                {translations(entry.label)}: {entry.timeRange ?? translations("closed")}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ConsentMap
        consentLabel={translations("loadMap")}
        declineLabel={translations("declineMap")}
        errorLabel={translations("mapError")}
        preferenceErrorLabel={translations("mapPreferenceError")}
        consentNotice={translations("mapConsent")}
        mapLabel={translations("mapLabel")}
        revokeLabel={translations("revokeMap")}
      />
    </section>
  );
}
