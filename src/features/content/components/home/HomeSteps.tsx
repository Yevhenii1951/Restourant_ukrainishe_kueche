import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ScrollReveal from "../ScrollReveal";

interface Step {
  number: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

export default async function HomeSteps(): Promise<React.ReactElement> {
  const t = await getTranslations("home");

  const steps: Step[] = [
    {
      number: "01",
      title: t("step1Title"),
      text: t("step1Text"),
      href: "/speisekarte",
      cta: t("menuCta"),
    },
    {
      number: "02",
      title: t("step2Title"),
      text: t("step2Text"),
      href: "/reservierung",
      cta: t("ctaReserve"),
    },
    {
      number: "03",
      title: t("step3Title"),
      text: t("step3Text"),
      href: "/catering",
      cta: t("offerCta"),
    },
  ];

  return (
    <section className="bleed bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
        <ScrollReveal>
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
              {t("stepsTitle")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink/70">{t("stepsLead")}</p>
          </div>
        </ScrollReveal>
        <ol className="mt-14 grid gap-10 sm:grid-cols-3">
          {steps.map((step, index) => (
            <ScrollReveal key={step.number} delayMs={index * 100}>
              <li className="group h-full border-t-2 border-brand/10 pt-6 transition-colors duration-300 hover:border-lime">
                <p className="font-display text-5xl font-semibold leading-none text-brand transition-colors duration-300 group-hover:text-brand-dark">
                  {step.number}
                </p>
                <h3 className="mt-5 font-display text-2xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 text-ink/70">{step.text}</p>
                <Link
                  href={step.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand transition-colors duration-300 hover:text-brand-dark"
                >
                  {step.cta}
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
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}