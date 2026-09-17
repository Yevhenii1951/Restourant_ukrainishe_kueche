import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en", "uk"],
  defaultLocale: "de",
  localeDetection: false,
  localePrefix: "always",
});