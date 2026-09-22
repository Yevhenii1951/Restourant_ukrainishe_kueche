import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ScrollReveal from "../ScrollReveal";

export default async function HomeServices(): Promise<React.ReactElement> {
  const t = await getTranslations("home");
  const content = await getTranslations("content");

  const services = [
    {
      href: "/events",
      image: "/beautiful-girl-in-national-dress.jpg",
      alt: "",
      title: content("eventsTitle"),
      lead: content("eventsLead"),
    },
    {
      href: "/catering",
      image: "/hero_ukrainian-dill-potatoes-2652561_1920.jpg",
      alt: "",
      title: content("cateringTitle"),
      lead: content("cateringLead"),
    },
  ];

  return (
    <section className="bleed bg-mint/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
        <ScrollReveal>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand/70">
              {t("servicesEyebrow")}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">
              {content("eventsTitle")}{" "}<span className="text-brand">&amp;</span>{" "}
              {content("cateringTitle").toLocaleLowerCase()}
            </h2>
          </div>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map((service, index) => (
            <ScrollReveal key={service.href} delayMs={index * 100}>
              <Link
                href={service.href}
                className="group block h-full overflow-hidden rounded-2xl border border-brand/10 bg-white transition-all duration-500 hover:border-brand/25 hover:shadow-xl hover:shadow-brand/10"
              >
                <div className="flex h-full flex-col sm:flex-row">
                  <div className="relative aspect-[16/9] overflow-hidden bg-mint sm:aspect-auto sm:w-[45%] sm:shrink-0">
                    <Image
                      src={service.image}
                      alt={service.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 45vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-4 p-6 sm:flex-1">
                    <div>
                      <h3 className="font-display text-2xl font-semibold text-ink">
                        {service.title}
                      </h3>
                      <p className="mt-2 text-ink/65">{service.lead}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/20 text-brand transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-lime"
                    >
                      <svg
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
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}