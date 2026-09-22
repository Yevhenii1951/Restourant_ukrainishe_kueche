import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/features/identity/authActions";
import {
  getAdminLoginPath,
  parseAuthLocale,
} from "@/features/identity/authPaths";
import { getCurrentStaff } from "@/features/identity/session";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const [{ locale: rawLocale }, staff] = await Promise.all([
    params,
    getCurrentStaff(),
  ]);
  const locale = parseAuthLocale(rawLocale);
  if (!staff) redirect(getAdminLoginPath(locale));
  const signOutForLocale = signOutAction.bind(null, locale);

  return (
    <div className="min-h-screen bg-brand-deep text-ink">
      <header className="border-b border-lime/25 bg-brand-deep px-4 py-4 text-cream shadow-lg shadow-black/20 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href={`/${locale}/admin`}
            className="font-display text-2xl font-semibold text-lime"
          >
            Kalyna Admin
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm font-semibold">
            <Link
              href={`/${locale}/admin/uebersicht`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Uebersicht
            </Link>
            <Link
              href={`/${locale}/admin/bestellungen`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Bestellungen
            </Link>
            <Link
              href={`/${locale}/admin/reservierungen`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Reservierungen
            </Link>
            <Link
              href={`/${locale}/admin/catering`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Catering
            </Link>
            <Link
              href={`/${locale}/admin/lieferzonen`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Lieferzonen
            </Link>
            <Link
              href={`/${locale}/admin/lieferzeiten`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Lieferzeiten
            </Link>
            <Link
              href={`/${locale}/admin/schliesszeiten`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Schliesszeiten
            </Link>
            <Link
              href={`/${locale}/admin/tische`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Tische
            </Link>
            <Link
              href={`/${locale}/admin/kombinationen`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Kombinationen
            </Link>
            <Link
              href={`/${locale}/admin/inhalte`}
              className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
            >
              Inhalte
            </Link>
            {staff.role === "ADMIN" && (
              <Link
                href={`/${locale}/admin/audit`}
                className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
              >
                Audit
              </Link>
            )}
            <span className="rounded-full border border-lime/35 px-2.5 py-1 text-xs font-bold text-lime">{staff.role}</span>
            <form action={signOutForLocale}>
              <button
                type="submit"
                className="text-cream/78 underline-offset-4 transition-colors hover:text-lime hover:underline"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl bg-porcelain px-4 py-8 shadow-2xl shadow-black/20 sm:px-6 lg:my-8 lg:rounded-lg">
        {children}
      </main>
    </div>
  );
}
