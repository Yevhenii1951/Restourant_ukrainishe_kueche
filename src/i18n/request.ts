import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { mergeMessagesWithGermanFallback } from "./mergeMessages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const german = (await import(`../messages/${routing.defaultLocale}.json`)).default;
  const localized = locale === routing.defaultLocale
    ? german
    : (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: mergeMessagesWithGermanFallback(german, localized),
  };
});