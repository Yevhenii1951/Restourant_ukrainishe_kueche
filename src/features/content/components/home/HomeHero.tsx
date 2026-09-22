import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LazyHeroVideo from "./LazyHeroVideo";

interface HomeHeroProps {
  title: string;
  lead: string;
  menuCount: number;
}

const POSTER = {
  src: "/hero_ukrainian-food-7323773_1920.jpg",
  poster: "/hero_ukrainian-food-7323773_1920.jpg",
};

export default async function HomeHero({
  title,
  lead,
  menuCount,
}: HomeHeroProps): Promise<React.ReactElement> {
  const t = await getTranslations("home");

  return (
    <section className="bleed relative overflow-hidden bg-brand-deep text-white">
      <Image
        src={POSTER.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <LazyHeroVideo src="/videos/hero.mp4" poster={POSTER.poster} />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/88 via-brand-deep/62 to-brand-deep/22" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-32 lg:min-h-[42rem] lg:px-10 lg:pb-24 lg:pt-40">
        <p className="inline-flex w-fit items-center gap-2.5 rounded-full border border-lime/45 bg-brand-deep/45 px-4 py-1.5 text-xs font-bold tracking-[0.16em] text-lime backdrop-blur-sm">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lime" />
          {t("eyebrow")}
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-medium leading-[0.98] text-white sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-cream/95">{lead}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/speisekarte" className="btn-lime label-slide" data-label={t("menuCta")}>
            <span>{t("menuCta")}</span>
          </Link>
          <Link href="/reservierung" className="btn-ghost-dark label-slide" data-label={t("ctaReserve")}>
            <span>{t("ctaReserve")}</span>
          </Link>
        </div>
        <a href="#home-steps" className="scroll-indicator group absolute bottom-6 right-4 hidden items-end gap-3 text-xs font-bold tracking-[0.16em] text-cream/80 sm:flex">
          <span>{t("menuCta")}</span>
          <span aria-hidden="true" />
        </a>
        <div className="mt-2 grid w-full max-w-xl grid-cols-3 gap-6 border-t border-lime/35 pt-6">
          <p className="font-display text-2xl font-semibold leading-tight text-lime">
            {t("dishesStat", { count: menuCount })}
          </p>
          <p className="font-display text-2xl font-semibold leading-tight text-lime">
            {t("hoursStat")}
          </p>
          <p className="font-display text-2xl font-semibold leading-tight text-lime">
            {t("cateringStat")}
          </p>
        </div>
      </div>
    </section>
  );
}