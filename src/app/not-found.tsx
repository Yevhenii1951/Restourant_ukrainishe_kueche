import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-semibold">Nicht gefunden</h2>
      <Link href="/" className="mt-4 inline-block underline">Zurück</Link>
    </div>
  );
}
