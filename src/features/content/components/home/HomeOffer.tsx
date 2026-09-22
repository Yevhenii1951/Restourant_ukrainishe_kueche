import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ScrollReveal from "../ScrollReveal";
import SplitParallax from "./SplitParallax";

interface HomeOfferProps {
  title: string;
  lead: string;
}

export default async function HomeOffer({
  title,
  lead,
}: HomeOfferProps): Promise<React.ReactElement> {
  const t = await getTranslations("home");

  return (
    <section className="bg-porcelain">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
        <ScrollReveal>
          <SplitParallax className="premium-panel split-scroll grid overflow-hidden rounded-3xl bg-brand-dark text-white md:grid-cols-2">
            <div className="split-media relative aspect-[16/10] md:aspect-auto">
              <Image
                src="/hero_ukrainian-dill-potatoes-2652561_1920.jpg"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-brand/20" />
            </div>
            <div className="split-copy flex flex-col justify-center gap-5 p-8 sm:p-12">
              <p className="inline-flex w-fit items-center gap-2.5 text-sm font-bold tracking-[0.16em] text-lime">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lime" />
                {t("offerEyebrow")}
              </p>
              <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
                {title}
              </h2>
              <p className="text-lg leading-relaxed text-cream/85">{lead}</p>
              <div className="pt-2">
                <Link href="/mittagstisch" className="btn-lime">
            {t("offerCta")}
          </Link>
              </div>
            </div>
          </SplitParallax>
        </ScrollReveal>
      </div>
    </section>
  );
}