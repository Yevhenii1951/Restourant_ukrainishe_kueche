"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";


export default function LocaleSwitcher(): React.ReactElement {
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label="Sprache" className="flex items-center gap-1">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === currentLocale ? "page" : undefined}
          className="min-h-11 min-w-11 rounded-md px-2 py-3 text-center text-xs font-semibold uppercase hover:bg-paper aria-[current=page]:text-kalyna"
        >
          {locale}
        </Link>
      ))}
    </nav>
  );
}
