import { describe, expect, it } from "vitest";
import {
  createCorrelationId,
  parseCorrelationId,
} from "@/lib/correlationId";

describe("correlation id", () => {
  it("creates a uuid", () => {
    expect(createCorrelationId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("parses a valid id", () => {
    expect(parseCorrelationId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    );
  });

  it("returns undefined for an empty value", () => {
    expect(parseCorrelationId("")).toBeUndefined();
  });

  it("returns undefined for an oversized value", () => {
    expect(parseCorrelationId("x".repeat(65))).toBeUndefined();
  });

  it("returns undefined for an invalid value with spaces", () => {
    expect(parseCorrelationId("has space")).toBeUndefined();
  });
});