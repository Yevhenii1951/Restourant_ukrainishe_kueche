"use client";

export default function AdminError({
  reset,
}: {
  reset: () => void;
}): React.ReactNode {
  return (
    <section className="space-y-4" role="alert">
      <h1 className="font-display text-2xl font-semibold">
        Adminbereich nicht verfügbar
      </h1>
      <p className="text-ink/75">Bitte versuche es erneut.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-kalyna px-4 py-2 font-medium text-white"
      >
        Erneut versuchen
      </button>
    </section>
  );
}
