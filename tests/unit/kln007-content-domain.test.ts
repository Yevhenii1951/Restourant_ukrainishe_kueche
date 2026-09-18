import { describe, expect, it } from "vitest";
import { CONTENT_SCHEMAS, pickText, type ContentKey } from "@/features/content/domain";
import {
  canManageContent,
  type StaffContext,
} from "@/features/identity/domain";

function staff(role: StaffContext["role"], active = true): StaffContext {
  return { id: "00000000-0000-0000-0000-000000000001", authUserId: "u1", role, active };
}

describe("KLN-007 content decision", () => {
  it("allows MANAGER and ADMIN to manage content", () => {
    expect(canManageContent(staff("MANAGER"))).toBe(true);
    expect(canManageContent(staff("ADMIN"))).toBe(true);
  });

  it("forbids STAFF from managing content", () => {
    expect(canManageContent(staff("STAFF"))).toBe(false);
  });

  it("forbids inactive managers", () => {
    expect(canManageContent(staff("MANAGER", false))).toBe(false);
  });
});

describe("KLN-007 typed payloads", () => {
  it("accepts a valid German home payload", () => {
    const parsed = CONTENT_SCHEMAS.home.safeParse({
      hero: { de: "Ukrainische Küche in Kassel" },
      storyTeaser: { de: "Handgemacht und herzlich." },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown fields as sanitization", () => {
    const parsed = CONTENT_SCHEMAS.home.safeParse({
      hero: { de: "Ukrainische Küche in Kassel" },
      storyTeaser: { de: "Handgemacht und herzlich." },
      script: "<script>alert(1)</script>",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing German canonical field", () => {
    const parsed = CONTENT_SCHEMAS.home.safeParse({
      hero: { en: "Ukrainian kitchen in Kassel" },
      storyTeaser: { de: "Handgemacht und herzlich." },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty canonical German field", () => {
    const parsed = CONTENT_SCHEMAS.home.safeParse({
      hero: { de: "" },
      storyTeaser: { de: "Handgemacht und herzlich." },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a typed faq payload with list rows", () => {
    const parsed = CONTENT_SCHEMAS.faq.safeParse({
      items: [
        { question: { de: "Öffnungszeiten?" }, answer: { de: "Täglich." }, category: "restaurant" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an entry without a required list row field", () => {
    const parsed = CONTENT_SCHEMAS.faq.safeParse({
      items: [{ question: { de: "Frage" }, category: "restaurant" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("exposes schemas for every supported content key", () => {
    const keys: ContentKey[] = [
      "home",
      "about",
      "faq",
      "lunch",
      "events",
      "gallery",
      "catering",
    ];
    for (const key of keys) {
      expect(CONTENT_SCHEMAS[key]).toBeDefined();
    }
  });
});

describe("KLN-007 German fallback", () => {
  it("falls back field-by-field to German", () => {
    expect(pickText({ de: "Hero", en: "Hero" }, "uk")).toBe("Hero");
    expect(pickText({ de: "Hero" }, "en")).toBe("Hero");
    expect(pickText({ de: "Hero" }, "de")).toBe("Hero");
  });

  it("returns an empty string for absent localized content", () => {
    expect(pickText(null, "de")).toBe("");
  });
});