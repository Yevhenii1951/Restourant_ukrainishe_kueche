import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import KalynaLogo from "./KalynaLogo";
import MobileActionBar from "./MobileActionBar";
import LocaleSwitcher from "./LocaleSwitcher";
import CartBadge from "@/features/cart/components/CartBadge";

export default async function SiteHeader(): Promise<React.ReactElement> {
  const navigationTranslations = await getTranslations("nav");
  const brandTranslations = await getTranslations("brand");

  const links = [
    { href: "/speisekarte", label: navigationTranslations("menu") },
    { href: "/mittagstisch", label: navigationTranslations("lunch") },
    { href: "/catering", label: navigationTranslations("catering") },
    { href: "/ueber-uns", label: navigationTranslations("ueberUns") },
    { href: "/kontakt", label: navigationTranslations("contact") },
  ];

  return (
    <header>
      <div className="sticky top-0 z-40 border-b border-brand-deep/10 bg-paper/88 shadow-sm shadow-brand-deep/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link
            href="/"
            aria-label={brandTranslations("name")}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <KalynaLogo />
            <span className="hidden rounded-full border border-lime/45 bg-cream/70 px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.14em] text-brand-dark sm:inline-flex">Portfolio-Demo</span>
          </Link>
          <nav
            aria-label={navigationTranslations("menu")}
            className="hidden items-center gap-7 lg:flex"
          >
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link-light">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <CartBadge />
            <Link
              href="/reservierung"
              className="btn-primary label-slide hidden !min-h-11 !px-5 sm:inline-flex"
              data-label={navigationTranslations("reserve")}
            >
              <span>{navigationTranslations("reserve")}</span>
            </Link>
            <LocaleSwitcher variant="light" />
          </div>
        </div>
      </div>
      <MobileActionBar />
    </header>
  );
}