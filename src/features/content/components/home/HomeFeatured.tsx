import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PublicMenuItem, SupportedLocale } from "@/features/menu/domain";
import { formatEuroCents } from "@/lib/format";
import ScrollReveal from "../ScrollReveal";

interface HomeFeaturedProps {
  items: PublicMenuItem[];
  locale: SupportedLocale;
}

export default async function HomeFeatured({
  items,
  locale,
}: HomeFeaturedProps): Promise<React.ReactElement> {
  const t = await getTranslations("home");

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand/70">
                {t("featuredEyebrow")}
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">
                {t("featuredTitle")}
              </h2>
            </div>
            <Link
              href="/speisekarte"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition-colors duration-300 hover:text-brand-dark"
            >
              {t("allDishes")}
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <ScrollReveal key={item.id} delayMs={index * 90}>
              <article className="group h-full overflow-hidden rounded-2xl border border-brand/10 bg-white transition-all duration-500 hover:-translate-y-1 hover:border-brand/25 hover:shadow-xl hover:shadow-brand/10">
                <Link href={`/speisekarte#${item.slug}`} className="block h-full">
                  <div className="relative aspect-[4/3] overflow-hidden bg-mint">
                    <Image
                      src={item.image.storagePath ?? "/2borsch.jpg"}
                      alt={item.image.alt ?? item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-lime px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-deep">
                      {item.categoryName}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-2xl font-semibold leading-tight text-ink">
                        {item.name}
                      </h3>
                      <p className="shrink-0 text-base font-bold text-brand">
                        {formatEuroCents(item.basePriceCents, locale)}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-ink/65">
                      {item.description}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                      {t("cardCta")}
                      <svg
                        aria-hidden="true"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}