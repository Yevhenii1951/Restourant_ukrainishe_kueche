export const AUTH_LOCALES = ["de", "en", "uk"] as const;
export type AuthLocale = (typeof AUTH_LOCALES)[number];

const DEFAULT_LOCALE: AuthLocale = "de";

export function parseAuthLocale(value: unknown): AuthLocale {
  return AUTH_LOCALES.includes(value as AuthLocale)
    ? (value as AuthLocale)
    : DEFAULT_LOCALE;
}

export function getAdminPath(locale: AuthLocale): string {
  return `/${locale}/admin`;
}

export function getAdminLoginPath(locale: AuthLocale): string {
  return `/${locale}/admin/login`;
}

export function getAdminPasswordPath(locale: AuthLocale): string {
  return `/${locale}/admin/password`;
}

export function normalizeAuthNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}

export function buildAuthCallbackUrl(origin: string, nextPath: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", nextPath);
  return url.toString();
}
