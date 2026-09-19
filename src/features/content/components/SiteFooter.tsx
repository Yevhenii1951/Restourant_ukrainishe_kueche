import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getOpeningState } from "@/features/contact/openingHours";
import { Link } from "@/i18n/navigation";

export default async function SiteFooter(): Promise<React.ReactElement> {
  const translations = await getTranslations("footer");
  const navigationTranslations = await getTranslations("nav");
  await connection();
  const openingState = getOpeningState(new Date());

  const pages = [
    { href: "/speisekarte", label: navigationTranslations("menu") },
    { href: "/ueber-uns", label: navigationTranslations("ueberUns") },
    { href: "/mittagstisch", label: navigationTranslations("lunch") },
    { href: "/events", label: navigationTranslations("events") },
    { href: "/galerie", label: navigationTranslations("gallery") },
    { href: "/catering", label: navigationTranslations("catering") },
    { href: "/faq", label: navigationTranslations("faq") },
    { href: "/kontakt", label: navigationTranslations("contact") },
    { href: "/anfahrt", label: navigationTranslations("directions") },
    { href: "/impressum", label: translations("imprint") },
    { href: "/datenschutz", label: translations("privacy") },
    { href: "/agb", label: translations("terms") },
  ];

  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center sm:px-6">
        <nav aria-label={navigationTranslations("menu")} className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {pages.map((page) => (
            <Link key={page.href} href={page.href} className="text-sm text-ink/70 hover:text-kalyna">
              {page.label}
            </Link>
          ))}
        </nav>
        <address className="space-y-1 text-sm not-italic text-ink/75">
          <p>{translations("address")}</p>
          <p>{translations("phone")}</p>
          <p>{translations(openingState === "open" ? "openNow" : "closedNow")}</p>
        </address>
        <p className="text-sm font-medium text-ink/80">{translations("demoDisclosure")}</p>
      </div>
    </footer>
  );
}
