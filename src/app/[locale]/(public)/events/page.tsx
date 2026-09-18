import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getPublicContentEntries } from "@/features/content/service";
import { resolveEvents } from "@/features/content/public";
import type { SupportedLocale } from "@/features/menu/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  return { title: t("eventsTitle"), description: t("eventsLead") };
}

export default async function EventsPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("content");
  const events = resolveEvents(
    await getPublicContentEntries(),
    locale as SupportedLocale,
  );

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("eventsTitle")}</h1>
      <p className="text-ink/80">{t("eventsLead")}</p>
      {events ? (
        <ul className="space-y-4">
          {events.items.map((event) => (
            <li key={event.title} className="rounded-md border border-ink/10 bg-linen p-4">
              <h2 className="font-medium text-ink">{event.title}</h2>
              <p className="mt-1 text-sm text-ink/80">{event.summary}</p>
              <p className="mt-2 text-xs text-ink/50">
                {event.startsAt} – {event.endsAt}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink/60">{t("empty")}</p>
      )}
    </section>
  );
}