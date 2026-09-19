import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("KLN-008 crawler policy", () => {
  it("blocks admin, internal APIs, checkout and token routes", () => {
    expect(robots()).toEqual({
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
      sitemap: "https://kalyna-demo.example/sitemap.xml",
    });
  });
});
