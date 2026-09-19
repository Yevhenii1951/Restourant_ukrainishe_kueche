import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import CartBadge from "@/features/cart/components/CartBadge";

export default async function MobileActionBar(): Promise<React.ReactElement> {
  const translations = await getTranslations("nav");

  const actions = [
    { label: translations("menu"), href: "/speisekarte" },
    { label: translations("order"), href: "/bestellen" },
    { label: translations("reserve"), href: "/reservierung" },
  ];

  return (
    <nav
      aria-label={translations("menu")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-linen/95 backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-5 px-1 py-1">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex min-h-11 items-center justify-center px-1 text-center text-xs font-medium text-ink/80 hover:text-kalyna"
            >
              {action.label}
            </Link>
          </li>
        ))}
        <li>
          <CartBadge />
        </li>
        <li>
          <a
            href="tel:+495610000000"
            className="flex min-h-11 items-center justify-center px-1 text-center text-xs font-medium text-ink/80 hover:text-kalyna"
          >
            {translations("call")}
          </a>
        </li>
      </ul>
    </nav>
  );
}