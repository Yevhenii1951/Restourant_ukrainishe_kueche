import type { PublicContentEntry } from "./public";

const NOW = "2026-09-21T00:00:00.000Z";

export function getDemoPublicContentEntries(): PublicContentEntry[] {
  return [
    {
      id: "demo-home",
      typedKey: "home",
      publishedAt: NOW,
      payload: {
        hero: {
          de: "Ukrainische Kueche in Kassel",
          en: "Ukrainian kitchen in Kassel",
        },
        storyTeaser: {
          de: "Borschtsch, Wareniki, Pampuschky und mehr - handgemacht und herzlich.",
          en: "Borscht, varenyky, pampushky and more - handmade and heartfelt.",
        },
      },
    },
    {
      id: "demo-about",
      typedKey: "about",
      publishedAt: NOW,
      payload: {
        intro: { de: "Ueber uns", en: "About us", uk: "Про нас" },
        story: {
          de: "Kalyna ist ein fiktives Portfolio-Demonstrations-Restaurant. Die Rezepte orientieren sich an der ukrainischen Hauskueche.",
        },
      },
    },
    {
      id: "demo-gallery",
      typedKey: "gallery",
      publishedAt: NOW,
      payload: {
        items: [
          {
            storagePath: "/2borsch.jpg",
            alt: { de: "Borschtsch mit Sauerrahm und Dill" },
          },
          {
            storagePath: "/vareniki1.jpg",
            alt: { de: "Wareniki mit Kartoffeln" },
          },
          { storagePath: "/deruni1.jpg", alt: { de: "Deruny mit Sauerrahm" } },
          {
            storagePath: "/golubtsi1.jpg",
            alt: { de: "Holubzi in Tomatensauce" },
          },
        ],
      },
    },
    {
      id: "demo-faq",
      typedKey: "faq",
      publishedAt: NOW,
      payload: {
        items: [
          {
            question: { de: "Bietet Kalyna vegetarische Gerichte an?" },
            answer: {
              de: "Ja, mehrere Demo-Gerichte sind vegetarisch markiert.",
            },
            category: "restaurant",
          },
        ],
      },
    },
    {
      id: "demo-events",
      typedKey: "events",
      publishedAt: NOW,
      payload: { items: [] },
    },
    {
      id: "demo-lunch",
      typedKey: "lunch",
      publishedAt: NOW,
      payload: {
        intro: { de: "Unser Mittagstisch - taeglich frisch zubereitet." },
        validFrom: "2026-09-01",
        validUntil: "2026-12-31",
      },
    },
    {
      id: "demo-catering",
      typedKey: "catering",
      publishedAt: NOW,
      payload: {
        intro: { de: "Feiern und Veranstaltungen ab 10 Gaesten." },
        constraints: {
          de: "Wir liefern auf Anfrage innerhalb von Kassel und Umgebung.",
        },
        responseNote: {
          de: "Unverbindliche Anfrage - Antwort innerhalb von zwei Werktagen.",
        },
      },
    },
  ];
}

export function withDemoContentFallback(
  entries: PublicContentEntry[],
): PublicContentEntry[] {
  return entries.length > 0 ? entries : getDemoPublicContentEntries();
}
