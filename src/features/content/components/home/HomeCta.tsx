import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomeCta(): Promise<React.ReactElement> {
  const t = await getTranslations("home");
  const brandTranslations = await getTranslations("brand");

  return (
    <section className="bleed relative overflow-hidden border-y border-lime/25 bg-brand-deep text-white">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 top-1/2 hidden -translate-y-1/2 select-none font-display text-[24vw] leading-none italic text-white/5 lg:block"
      >
        {brandTranslations("name")}
      </span>
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-8 sm:py-28">
        <h2 className="mx-auto max-w-3xl font-display text-5xl font-medium leading-tight sm:text-6xl">
          {t("ctaTitle")}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-cream/80">
          {t("ctaLead")}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/reservierung" className="btn-lime label-slide" data-label={t("ctaReserve")}>
            <span>{t("ctaReserve")}</span>
          </Link>
          <a href="tel:+495610000000" className="btn-ghost-dark label-slide" data-label={t("ctaCallLabel")}>
            <span>{t("ctaCallLabel")}</span>
          </a>
        </div>
      </div>
    </section>
  );
}