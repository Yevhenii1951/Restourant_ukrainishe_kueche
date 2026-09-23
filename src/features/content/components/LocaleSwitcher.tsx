"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

interface LocaleSwitcherProps {
  variant?: "dark" | "light";
}

export default function LocaleSwitcher({
  variant = "light",
}: LocaleSwitcherProps): React.ReactElement {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const isDark = variant === "dark";

  return (
    <nav aria-label="Sprache" className="flex items-center gap-0.5">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === currentLocale ? "page" : undefined}
          className={`min-h-11 min-w-9 rounded-md px-1.5 py-3 text-center text-xs font-semibold uppercase transition-colors duration-300 ${
            isDark
              ? "text-white/80 hover:bg-white/10 hover:text-lime aria-[current=page]:text-lime"
              : "hover:bg-paper aria-[current=page]:text-kalyna"
          }`}
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}