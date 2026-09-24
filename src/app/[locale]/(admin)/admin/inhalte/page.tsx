import Link from "next/link";
import { getServerPool } from "@/lib/db/serverPool";
import { canManageContent } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import { createPostgresContentStore } from "@/features/content/postgresContentStore";
import { ContentEntryRowActions } from "@/features/content/components/ContentEntryRowActions";
import type { ContentKey } from "@/features/content/domain";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const CONTENT_TITLES: Record<ContentKey, string> = {
  home: "Startseite",
  about: "Über uns",
  faq: "FAQ",
  lunch: "Mittagstisch",
  events: "Veranstaltungen",
  gallery: "Galerie",
  catering: "Catering",
};

export default async function InhaltePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactNode> {
  const { locale } = await params;
  const staff = await getCurrentStaff();
  if (!staff) return null;

  const pool = getServerPool();
  const entries = pool
    ? await createPostgresContentStore(pool).listEntries()
    : [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Inhalte</h1>
        <p className="text-ink/75">Bearbeitbare Seiteninhalte – jede Publikation ist versionspflichtig.</p>
      </header>

      {!canManageContent(staff) ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Keine Berechtigung zum Bearbeiten von Inhalten (MANAGER oder höher).
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-md border border-ink/10 bg-linen">
          {entries.map((entry) => (
            <li
              key={entry.typedKey}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  href={`/${locale}/admin/inhalte/${entry.typedKey}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {CONTENT_TITLES[entry.typedKey]}
                </Link>
                <p className="text-xs text-ink/60">
                  {entry.typedKey} · Version {entry.version} · {entry.publicationState}
                </p>
              </div>
              <ContentEntryRowActions
                typedKey={entry.typedKey}
                version={entry.version}
                publicationState={entry.publicationState}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}