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
          de: "Ukrainische Küche in Kassel",
          en: "Ukrainian kitchen in Kassel",
          uk: "Українська кухня в Касселі",
        },
        storyTeaser: {
          de: "Borschtsch, Wareniki, Pampuschky und mehr – handgemacht und herzlich.",
          en: "Borscht, varenyky, pampushky and more – handmade and heartfelt.",
          uk: "Борщ, вареники, пампушки та інше – приготовано з душею.",
        },
      },
    },
    {
      id: "demo-about",
      typedKey: "about",
      publishedAt: NOW,
      payload: {
        intro: {
          de: "Über uns",
          en: "About us",
          uk: "Про нас",
        },
        story: {
          de: "Kalyna ist ein fiktives Portfolio-Demonstrations-Restaurant. Die Rezepte orientieren sich an der ukrainischen Hausküche: Rote-Bete-Borschtsch, handgeformte Wareniki, goldbraune Deruny und Kiewer Kotelett. Alles wird täglich frisch zubereitet und sagt so einfach wie herzlich aus – ein Stück ukrainische Gastfreundschaft am Tisch.",
          en: "Kalyna is a fictional portfolio demo restaurant. The recipes follow the Ukrainian home kitchen: beet borscht, hand-shaped varenyky, golden deruny and chicken Kyiv. Everything is prepared fresh each day and speaks simply and warmly – a piece of Ukrainian hospitality at the table.",
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
            storagePath: "/1borsch.jpg",
            alt: { de: "Borschtsch-Variation aus der Küche" },
          },
          {
            storagePath: "/borsch%201.jpg",
            alt: { de: "Klassischer Borschtsch, frisch angerichtet" },
          },
          {
            storagePath: "/borsch%202.jpg",
            alt: { de: "Borschtsch mit Sauerrahm, in der Schale serviert" },
          },
          {
            storagePath: "/vareniki1.jpg",
            alt: { de: "Wareniki mit Kartoffeln und Röstzwiebeln" },
          },
          {
            storagePath: "/vareniki2.jpg",
            alt: { de: "Gefüllte Teigtaschen auf dem Teller" },
          },
          {
            storagePath: "/vareniki3.jpg",
            alt: { de: "Wareniki mit fruchtiger Füllung" },
          },
          {
            storagePath: "/deruni1.jpg",
            alt: { de: "Deruny mit Sauerrahm und Dill" },
          },
          {
            storagePath: "/deruni2.jpg",
            alt: { de: "Knusprige Kartoffelpuffer, goldbraun gebraten" },
          },
          {
            storagePath: "/golubtsi1.jpg",
            alt: { de: "Holubzi in Tomatensauce" },
          },
          {
            storagePath: "/golubtsi2.jpg",
            alt: { de: "Kohlrouladen, angerichtet mit Sauce" },
          },
          {
            storagePath: "/kotleta1.jpg",
            alt: { de: "Paniertes Kotelett auf dem Teller" },
          },
          {
            storagePath: "/kotleta2.jpg",
            alt: { de: "Golden gebratene Kotelette" },
          },
          {
            storagePath: "/kotleta_po_Kievski1.jpg",
            alt: { de: "Paniertes Kiewer Kotelett" },
          },
          {
            storagePath: "/kotleta_po_Kievski2.jpg",
            alt: { de: "Kiewer Kotelett mit Kräuterbutter" },
          },
          {
            storagePath: "/pampushki1.jpg",
            alt: { de: "Pampushky mit Knoblauch" },
          },
          {
            storagePath: "/pampushki2.jpg",
            alt: { de: "Hefeteigbrötchen – Pampushky" },
          },
          {
            storagePath: "/pampushki3.jpg",
            alt: { de: "Warme Pampushky aus dem Ofen" },
          },
          {
            storagePath: "/kutja.jpg",
            alt: { de: "Kutja – süßer Getreidebrei" },
          },
          {
            storagePath: "/uzvar1.jpg",
            alt: { de: "Uzvar aus getrockneten Früchten" },
          },
          {
            storagePath: "/uzvar2.jpg",
            alt: { de: "Uzvar in einer Karaffe" },
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
            question: {
              de: "Bietet Kalyna auch vegetarische Gerichte an?",
            },
            answer: {
              de: "Ja, mehrere Demo-Gerichte sind vegetarisch markiert – etwa der Vegetarische Borschtsch, Wareniki mit Kartoffeln, Deruny und Syrnyky.",
            },
            category: "restaurant",
          },
          {
            question: {
              de: "Gibt es glutenfreie Optionen?",
            },
            answer: {
              de: "Einzelne Gerichte wie Uzvar sind glutenfrei. Bitte beachten Sie, dass in der Küche Gluten verarbeitet wird; Hinweise finden Sie bei jedem Gericht.",
            },
            category: "restaurant",
          },
          {
            question: {
              de: "Kann ich einen Tisch reservieren?",
            },
            answer: {
              de: "Ja – über die Seite „Tisch reservieren“ können Sie live freie Zeiten prüfen und eine Demo-Anfrage senden.",
            },
            category: "reservierung",
          },
          {
            question: {
              de: "Gibt es einen Mittagstisch?",
            },
            answer: {
              de: "Ja, unser Demo-Mittagstisch wechselt täglich und ist gültig im angegebenen Zeitraum.",
            },
            category: "restaurant",
          },
          {
            question: {
              de: "Bietet Kalyna Catering an?",
            },
            answer: {
              de: "Für Feiern und Veranstaltungen ab 10 Gästen können Sie eine unverbindliche Demo-Anfrage senden.",
            },
            category: "catering",
          },
        ],
      },
    },
    {
      id: "demo-events",
      typedKey: "events",
      publishedAt: NOW,
      payload: {
        items: [
          {
            title: {
              de: "Demo-Abend der ukrainischen Küche",
            },
            summary: {
              de: "Eine kleine Auswahl an Vorspeisen und Getränken – reine Demo-Veranstaltung, kein echter Termin.",
            },
            startsAt: "2026-10-10",
            endsAt: "2026-10-10",
          },
          {
            title: {
              de: "Varenyky-Workshop (Demo)",
            },
            summary: {
              de: "Gemeinsames Formen von Wareniki – Demo-Veranstaltung, kein echter Termin.",
            },
            startsAt: "2026-11-14",
            endsAt: "2026-11-14",
          },
        ],
      },
    },
    {
      id: "demo-lunch",
      typedKey: "lunch",
      publishedAt: NOW,
      payload: {
        intro: {
          de: "Unser Mittagstisch – täglich frisch zubereitet.",
          en: "Our lunch menu – freshly prepared every day.",
        },
        validFrom: "2026-09-01",
        validUntil: "2026-12-31",
      },
    },
    {
      id: "demo-catering",
      typedKey: "catering",
      publishedAt: NOW,
      payload: {
        intro: {
          de: "Feiern und Veranstaltungen ab 10 Gästen.",
          en: "Celebrations and events for 10 or more guests.",
        },
        constraints: {
          de: "Wir liefern auf Anfrage innerhalb von Kassel und Umgebung. Demo-Restaurant – keine echter Lieferbetrieb.",
          en: "We deliver on request within Kassel and surroundings. Demo restaurant – not a real delivery service.",
        },
        responseNote: {
          de: "Unverbindliche Anfrage – Antwort innerhalb von zwei Werktagen.",
          en: "Non-binding request – reply within two working days.",
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