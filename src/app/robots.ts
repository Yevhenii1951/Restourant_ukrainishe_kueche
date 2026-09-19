import type { MetadataRoute } from "next";
import { SITE_URL } from "@/features/seo/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/admin",
        "/*/kasse",
        "/*/warenkorb",
        "/*/bestellung/",
        "/*/reservierung/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
