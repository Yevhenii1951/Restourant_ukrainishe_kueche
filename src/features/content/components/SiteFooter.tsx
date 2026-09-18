import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function SiteFooter() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  const pages = [
    { href: "/speisekarte", label: tNav("menu") },
    { href: "/ueber-uns", label: tNav("ueberUns") },
    { href: "/mittagstisch", label: tNav("lunch") },
    { href: "/events", label: tNav("events") },
    { href: "/galerie", label: tNav("gallery") },
    { href: "/catering", label: tNav("catering") },
    { href: "/faq", label: tNav("faq") },
  ];

  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center sm:px-6">
        <nav aria-label={tNav("menu")} className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {pages.map((page) => (
            <Link key={page.href} href={page.href} className="text-sm text-ink/70 hover:text-kalyna">
              {page.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm font-medium text-ink/80">{t("demoDisclosure")}</p>
      </div>
    </footer>
  );
}