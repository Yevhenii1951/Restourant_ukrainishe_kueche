import type { Metadata } from "next";
import Link from "next/link";
import { PasswordUpdateForm } from "@/features/identity/components/PasswordUpdateForm";
import { isSupabaseStaffAuthConfigured } from "@/features/identity/authConfig";
import {
  getAdminLoginPath,
  parseAuthLocale,
} from "@/features/identity/authPaths";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Set staff password | Kalyna",
  robots: { index: false, follow: false },
};

export default async function AdminPasswordPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>): Promise<React.ReactNode> {
  const { locale: rawLocale } = await params;
  const locale = parseAuthLocale(rawLocale);
  const configured = isSupabaseStaffAuthConfigured();

  return (
    <main className="min-h-screen bg-linen px-4 py-10 text-ink sm:px-6">
      <section className="mx-auto max-w-md space-y-6 rounded-md border border-ink/10 bg-linen p-5 shadow-sm">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold">
            Set staff password
          </h1>
          <p className="text-sm text-ink/70">
            Use this page after an invite or reset email opens a Supabase staff
            session in this browser.
          </p>
        </div>
        {configured ? (
          <PasswordUpdateForm locale={locale} />
        ) : (
          <p className="text-sm text-kalyna">
            Supabase staff auth is not configured yet.
          </p>
        )}
        <Link
          href={getAdminLoginPath(locale)}
          className="block text-sm underline-offset-4 hover:underline"
        >
          Back to staff login
        </Link>
      </section>
    </main>
  );
}
