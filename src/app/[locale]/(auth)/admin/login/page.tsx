import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/features/identity/components/AdminLoginForm";
import { isSupabaseStaffAuthConfigured } from "@/features/identity/authConfig";
import { getAdminPath, parseAuthLocale } from "@/features/identity/authPaths";
import { getCurrentStaff } from "@/features/identity/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin login | Kalyna",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>): Promise<React.ReactNode> {
  const { locale: rawLocale } = await params;
  const locale = parseAuthLocale(rawLocale);
  const configured = isSupabaseStaffAuthConfigured();
  const staff = configured ? await getCurrentStaff() : null;
  if (staff) redirect(getAdminPath(locale));

  return (
    <main className="min-h-screen bg-linen px-4 py-10 text-ink sm:px-6">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-5 pt-4">
          <Link
            href={`/${locale}`}
            className="text-sm underline-offset-4 hover:underline"
          >
            Back to restaurant
          </Link>
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">
              Kalyna staff access
            </h1>
            <p className="max-w-2xl text-ink/75">
              Sign in with the Supabase staff account from your invitation.
              Public ordering stays available without staff access.
            </p>
          </div>
          {!configured && (
            <p className="max-w-2xl rounded-md border border-kalyna/30 bg-paper p-4 text-sm text-kalyna">
              Supabase staff auth is not configured yet. Add the Supabase URL,
              anon key, service role key and site URL before using admin login.
            </p>
          )}
        </div>
        <div className="rounded-md border border-ink/10 bg-linen p-5 shadow-sm">
          {configured ? (
            <AdminLoginForm locale={locale} />
          ) : (
            <p className="text-sm text-ink/70">
              Login form will activate automatically after Supabase environment
              variables are set.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
