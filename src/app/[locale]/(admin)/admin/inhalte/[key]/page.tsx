import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canManageContent } from "@/features/identity/domain";
import { getCurrentStaff } from "@/features/identity/session";
import { isContentKey } from "@/features/content/domain";
import { CONTENT_EDITOR_FIELDS } from "@/features/content/editorMeta";
import { getServerPool } from "@/lib/db/serverPool";
import { createPostgresContentStore } from "@/features/content/postgresContentStore";
import ContentEntryEditor from "@/features/content/components/ContentEntryEditor";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function InhalteEditorPage({
  params,
}: {
  params: Promise<{ locale: string; key: string }>;
}): Promise<React.ReactNode> {
  const { locale, key } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${locale}`);

  if (!isContentKey(key)) notFound();

  if (!canManageContent(staff)) {
    return (
      <section className="space-y-6">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Keine Berechtigung zum Bearbeiten von Inhalten (MANAGER oder höher).
        </p>
      </section>
    );
  }

  const pool = getServerPool();
  const entry = pool
    ? await createPostgresContentStore(pool).getEntry(key)
    : null;
  if (!entry) notFound();

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <ContentEntryEditor
        typedKey={key}
        heading={key}
        fields={CONTENT_EDITOR_FIELDS[key]}
        entryVersion={entry.version}
        publicationState={entry.publicationState}
        publishedVersion={entry.publishedVersion}
        initialPayload={entry.payload}
      />
      <Link
        href={`/${locale}/admin/inhalte`}
        className="block text-sm underline-offset-4 hover:underline"
      >
        Zurück zur Übersicht
      </Link>
    </section>
  );
}