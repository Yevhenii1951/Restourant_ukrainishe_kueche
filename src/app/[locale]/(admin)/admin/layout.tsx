import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  const [{ locale }, staff] = await Promise.all([params, getCurrentStaff()]);
  if (!staff) redirect(`/${locale}`);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-linen px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href={`/${locale}/admin`}
            className="font-display text-xl font-semibold"
          >
            Kalyna Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href={`/${locale}/admin/bestellungen`} className="underline-offset-4 hover:underline">
              Bestellungen
            </Link>
            <Link href={`/${locale}/admin/tische`} className="underline-offset-4 hover:underline">
              Tische
            </Link>
            <Link href={`/${locale}/admin/kombinationen`} className="underline-offset-4 hover:underline">
              Kombinationen
            </Link>
            <Link href={`/${locale}/admin/inhalte`} className="underline-offset-4 hover:underline">
              Inhalte
            </Link>
            <span>{staff.role}</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
