"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="text-center py-20 text-red-700">
      <h2 className="text-2xl font-semibold">Fehler</h2>
      <pre className="mt-4 text-xs whitespace-pre-wrap">{error.message}</pre>
    </div>
  );
}
