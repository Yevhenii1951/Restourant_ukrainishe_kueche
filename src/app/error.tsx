"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Upps, etwas ist schiefgelaufen</h1>
      <p className="max-w-md text-stone-600">
        Bitte versuche es erneut. Falls der Fehler bleibt, erreichst du uns telefonisch
        unter der auf der Website angegebenen Nummer.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white"
      >
        Erneut versuchen
      </button>
    </main>
  );
}