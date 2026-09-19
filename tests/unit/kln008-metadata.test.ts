import { describe, expect, it } from "vitest";
import { buildPublicMetadata } from "@/features/seo/publicMetadata";

describe("KLN-008 public metadata", () => {
  it("uses a self-canonical and matching locale alternatives", () => {
    expect(
      buildPublicMetadata({
        locale: "en",
        path: "/kontakt",
        title: "Contact | Kalyna",
        description: "Demo contact details for Kalyna in Kassel.",
      }),
    ).toMatchObject({
      title: "Contact | Kalyna",
      description: "Demo contact details for Kalyna in Kassel.",
      alternates: {
        canonical: "https://kalyna-demo.example/en/kontakt",
        languages: {
          de: "https://kalyna-demo.example/de/kontakt",
          en: "https://kalyna-demo.example/en/kontakt",
          uk: "https://kalyna-demo.example/uk/kontakt",
          "x-default": "https://kalyna-demo.example/de/kontakt",
        },
      },
    });
  });
});
