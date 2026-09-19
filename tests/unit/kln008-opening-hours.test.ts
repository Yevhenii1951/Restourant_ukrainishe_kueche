import { describe, expect, it } from "vitest";
import { getOpeningState } from "@/features/contact/openingHours";

describe("KLN-008 current opening state", () => {
  it("uses the configured weekly hours in Europe/Berlin", () => {
    expect(getOpeningState(new Date("2026-09-22T17:00:00Z"))).toBe("open");
    expect(getOpeningState(new Date("2026-09-21T17:00:00Z"))).toBe("closed");
    expect(getOpeningState(new Date("2026-09-27T19:00:00Z"))).toBe("closed");
  });
});
