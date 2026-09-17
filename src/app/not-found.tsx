import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Seite nicht gefunden</h1>
      <p className="max-w-md text-stone-600">Die gesuchte Seite existiert nicht.</p>
      <Link href="/" className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white">
        Zur Startseite
      </Link>
    </main>
  );
}