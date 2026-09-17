import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MobileActionBar from "./MobileActionBar";

export default async function SiteHeader() {
  const t = await getTranslations("nav");
  const tBrand = await getTranslations("brand");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-linen/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold text-kalyna" aria-label={tBrand("name")}>
          {tBrand("name")}
        </Link>
        <nav aria-label={t("menu")} className="hidden items-center gap-6 sm:flex">
          <Link href="/speisekarte" className="font-medium text-ink/80 hover:text-kalyna">
            {t("menu")}
          </Link>
          <Link href="/bestellen" className="font-medium text-ink/80 hover:text-kalyna">
            {t("order")}
          </Link>
          <Link href="/reservierung" className="font-medium text-ink/80 hover:text-kalyna">
            {t("reserve")}
          </Link>
          <a
            href="tel:+495610000000"
            className="rounded-lg bg-kalyna px-4 py-2 font-medium text-white"
          >
            {t("call")}
          </a>
        </nav>
      </div>
      <MobileActionBar />
    </header>
  );
}