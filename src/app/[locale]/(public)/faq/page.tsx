import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveFaq } from "@/features/content/public";
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
    path: "/faq",
    title: t("faqTitle"),
    description: t("faqLead"),
  });
}

export default async function FaqPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("content");
  const faq = resolveFaq(await getPublicContentEntries(), parseSupportedLocale(locale));

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("faqTitle")}</h1>
      <p className="text-ink/80">{t("faqLead")}</p>
      {faq ? (
        <ul className="space-y-4">
          {faq.items.map((item) => (
            <li key={item.question} className="rounded-md border border-ink/10 bg-linen p-4">
              <h2 className="font-medium text-ink">{item.question}</h2>
              <p className="mt-1 text-sm text-ink/80">{item.answer}</p>
              <p className="mt-2 text-xs text-ink/50">{item.category}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink/60">{t("empty")}</p>
      )}
    </section>
  );
}