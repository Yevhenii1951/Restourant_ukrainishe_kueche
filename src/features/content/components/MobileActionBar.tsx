import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function MobileActionBar() {
  const t = await getTranslations("nav");

  const actions = [
    { label: t("menu"), href: "/speisekarte" },
    { label: t("order"), href: "/bestellen" },
    { label: t("cart"), href: "/warenkorb" },
    { label: t("reserve"), href: "/reservierung" },
  ];

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-linen/95 backdrop-blur sm:hidden"
    >
      <ul className="flex justify-around px-1 py-1">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex min-h-11 items-center px-3 text-sm font-medium text-ink/80 hover:text-kalyna"
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}