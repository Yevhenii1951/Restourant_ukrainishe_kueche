import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'self'",
          "form-action 'self'",
          "object-src 'none'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
          "connect-src 'self'",
          "font-src 'self' data:",
        ].join("; "),
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
