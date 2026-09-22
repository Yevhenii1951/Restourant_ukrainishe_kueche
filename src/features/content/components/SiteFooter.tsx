import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getOpeningState } from "@/features/contact/openingHours";
import { Link } from "@/i18n/navigation";
import KalynaLogo from "./KalynaLogo";

interface FooterLink {
  href: string;
  label: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export default async function SiteFooter(): Promise<React.ReactElement> {
  const translations = await getTranslations("footer");
  const navigationTranslations = await getTranslations("nav");
  const brandTranslations = await getTranslations("brand");
  await connection();
  const openingState = getOpeningState(new Date());

  const columns: FooterColumn[] = [
    {
      heading: navigationTranslations("menu"),
      links: [
        { href: "/mittagstisch", label: navigationTranslations("lunch") },
        { href: "/catering", label: navigationTranslations("catering") },
        { href: "/faq", label: navigationTranslations("faq") },
      ],
    },
    {
      heading: navigationTranslations("ueberUns"),
      links: [
        { href: "/galerie", label: navigationTranslations("gallery") },
        { href: "/events", label: navigationTranslations("events") },
        { href: "/reservierung", label: navigationTranslations("reserve") },
      ],
    },
    {
      heading: navigationTranslations("contact"),
      links: [
        { href: "/anfahrt", label: navigationTranslations("directions") },
        { href: "/bestellen", label: navigationTranslations("order") },
        { href: "/warenkorb", label: navigationTranslations("cart") },
      ],
    },
    {
      heading: translations("legal"),
      links: [
        { href: "/impressum", label: translations("imprint") },
        { href: "/datenschutz", label: translations("privacy") },
        { href: "/agb", label: translations("terms") },
      ],
    },
  ];

  return (
    <footer className="border-t-2 border-lime bg-brand-deep pb-28 text-white sm:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 text-lime">
              <KalynaLogo tone="dark" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-cream/70">
              {translations("tagline")}
            </p>
            <p>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  openingState === "open"
                    ? "border-lime/40 text-lime"
                    : "border-white/20 text-cream/70"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    openingState === "open" ? "bg-lime" : "bg-white/40"
                  }`}
                />
                {translations(openingState === "open" ? "openNow" : "closedNow")}
              </span>
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-lime">
                {column.heading}
              </h2>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream/80 transition-colors duration-300 hover:text-lime"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-cream/60">
            © {new Date().getFullYear()} {brandTranslations("name")} —{" "}
            {translations("demoDisclosure")}
          </p>
          <p className="text-sm text-cream/60">{translations("address")}</p>
        </div>
      </div>
    </footer>
  );
}