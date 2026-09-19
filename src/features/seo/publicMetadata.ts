import type { Metadata } from "next";
import { localizedSiteUrl, SITE_LOCALES, type SiteLocale } from "./site";


interface PublicMetadataInput {
  locale: SiteLocale;
  path: string;
  title: string;
  description: string;
}


export function buildPublicMetadata({
  locale,
  path,
  title,
  description,
}: PublicMetadataInput): Metadata {
  const languages = Object.fromEntries(
    SITE_LOCALES.map((candidate) => [candidate, localizedSiteUrl(candidate, path)]),
  );

  return {
    title,
    description,
    alternates: {
      canonical: localizedSiteUrl(locale, path),
      languages: {
        ...languages,
        "x-default": localizedSiteUrl("de", path),
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      alternateLocale: SITE_LOCALES.filter((candidate) => candidate !== locale),
      url: localizedSiteUrl(locale, path),
      siteName: "Kalyna",
    },
  };
}
