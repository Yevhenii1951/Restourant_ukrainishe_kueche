import { getTranslations } from "next-intl/server";

export default async function SiteFooter() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center sm:px-6">
        <p className="text-sm text-ink/70">{tNav("menu")}</p>
        <p className="text-sm font-medium text-ink/80">{t("demoDisclosure")}</p>
      </div>
    </footer>
  );
}