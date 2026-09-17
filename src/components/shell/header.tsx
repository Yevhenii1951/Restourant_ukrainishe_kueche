import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-stone-200 py-4">
      <Link href="/" className="text-xl font-bold tracking-tight text-brand-stone">Kalyna</Link>
      <nav className="flex gap-6 text-sm font-medium text-stone-600">
        <Link href="/" className="hover:text-brand-amber">Menu</Link>
        <Link href="/" className="hover:text-brand-amber">Reservierung</Link>
      </nav>
    </header>
  );
}
