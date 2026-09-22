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
      <div className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link
            href="/"
            aria-label={brandTranslations("name")}
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <KalynaLogo />
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
              className="btn-lime hidden !min-h-11 !px-5 sm:inline-flex"
            >
              {navigationTranslations("reserve")}
            </Link>
            <LocaleSwitcher variant="light" />
          </div>
        </div>
      </div>
      <MobileActionBar />
    </header>
  );
}