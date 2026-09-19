import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MobileActionBar from "./MobileActionBar";
import LocaleSwitcher from "./LocaleSwitcher";

export default async function SiteHeader(): Promise<React.ReactElement> {
  const navigationTranslations = await getTranslations("nav");
  const brandTranslations = await getTranslations("brand");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-linen/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold text-kalyna" aria-label={brandTranslations("name")}>
          {brandTranslations("name")}
        </Link>
        <nav aria-label={navigationTranslations("menu")} className="hidden items-center gap-6 sm:flex">
          <Link href="/speisekarte" className="font-medium text-ink/80 hover:text-kalyna">
            {navigationTranslations("menu")}
          </Link>
          <Link href="/bestellen" className="font-medium text-ink/80 hover:text-kalyna">
            {navigationTranslations("order")}
          </Link>
          <Link href="/reservierung" className="font-medium text-ink/80 hover:text-kalyna">
            {navigationTranslations("reserve")}
          </Link>
          <a
            href="tel:+495610000000"
            className="rounded-lg bg-kalyna px-4 py-2 font-medium text-white"
          >
            {navigationTranslations("call")}
          </a>
        </nav>
        <LocaleSwitcher />
      </div>
      <MobileActionBar />
    </header>
  );
}