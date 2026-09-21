import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  getAdminLoginPath,
  getAdminPasswordPath,
  getAdminPath,
  normalizeAuthNextPath,
  parseAuthLocale,
} from "@/features/identity/authPaths";

describe("Supabase admin auth paths", () => {
  it("keeps admin auth paths localized", () => {
    expect(getAdminPath("de")).toBe("/de/admin");
    expect(getAdminLoginPath("en")).toBe("/en/admin/login");
    expect(getAdminPasswordPath("uk")).toBe("/uk/admin/password");
  });

  it("falls back to German for unsupported locales", () => {
    expect(parseAuthLocale("fr")).toBe("de");
    expect(parseAuthLocale(undefined)).toBe("de");
  });

  it("rejects external callback destinations", () => {
    expect(normalizeAuthNextPath("/de/admin")).toBe("/de/admin");
    expect(normalizeAuthNextPath("https://example.com")).toBeNull();
    expect(normalizeAuthNextPath("//example.com/path")).toBeNull();
    expect(normalizeAuthNextPath("admin")).toBeNull();
  });

  it("builds a Supabase callback URL with a relative next path", () => {
    expect(buildAuthCallbackUrl("https://kalyna.test", "/de/admin")).toBe(
      "https://kalyna.test/auth/callback?next=%2Fde%2Fadmin",
    );
  });
});
