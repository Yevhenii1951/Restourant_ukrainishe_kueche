import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveGallery } from "@/features/content/public";
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
    path: "/galerie",
    title: t("galleryTitle"),
    description: t("galleryLead"),
  });
}

export default async function GalleryPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("content");
  const gallery = resolveGallery(
    await getPublicContentEntries(),
    parseSupportedLocale(locale),
  );

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("galleryTitle")}</h1>
      <p className="text-ink/80">{t("galleryLead")}</p>
      {gallery ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {gallery.items.map((item) => (
            <li key={item.storagePath}>
              <Image
                src={item.storagePath}
                alt={item.alt}
                width={400}
                height={400}
                className="aspect-square w-full rounded-md border border-ink/10 object-cover"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink/60">{t("empty")}</p>
      )}
    </section>
  );
}