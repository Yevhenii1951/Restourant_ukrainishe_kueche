import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import SiteHeader from "@/features/content/components/SiteHeader";
import SiteFooter from "@/features/content/components/SiteFooter";
import AssistantLauncher from "@/features/ai/components/AssistantLauncher";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("a11y");

  return (
    <div className="flex min-h-screen flex-col bg-porcelain">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:font-medium"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14"
      >
        {children}
      </main>
      <SiteFooter />
      <AssistantLauncher locale={locale} />
    </div>
  );
}
