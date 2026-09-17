import { describe, it, expect } from "vitest";
import { parseClientEnv, parseServerEnv } from "@/lib/env/schemas";
import { redactMeta, formatLogLine } from "@/lib/logger";

const SERVER_ONLY_KEYS = [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "BREVO_API_KEY",
  "AI_PROVIDER_KEY",
  "CRON_SECRET",
];

describe("KLN-001 environment schemas", () => {
  it("server schema parses a full valid environment", () => {
    const env = parseServerEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/kalyna_test",
      STRIPE_SECRET_KEY: "sk_test_123",
    });
    expect(env.NODE_ENV).toBe("test");
    expect(env.DATABASE_URL).toContain("kalyna_test");
  });

  it("client schema never exposes a server-only key", () => {
    const env = parseClientEnv({
      NEXT_PUBLIC_DEMO: "true",
      DATABASE_URL: "postgresql://user:pass@host/db",
      SUPABASE_SERVICE_ROLE_KEY: "service-secret",
      STRIPE_SECRET_KEY: "sk_live_secret",
    });
    for (const key of SERVER_ONLY_KEYS) {
      expect(key in env).toBe(false);
    }
    expect(env.NEXT_PUBLIC_DEMO).toBe("true");
  });

  it("client schema defaults NEXT_PUBLIC_DEMO to true", () => {
    const env = parseClientEnv({});
    expect(env.NEXT_PUBLIC_DEMO).toBe("true");
  });
});

describe("KLN-001 sanitized logger", () => {
  it("redacts known sensitive meta keys", () => {
    const meta = {
      email: "kunde@example.com",
      password: "geheim123",
      apiKey: "sk_live_abc",
      plain: "sichtbar",
    };
    const line = redactMeta(meta);
    expect(line.email).toBe("[REDACTED]");
    expect(line.password).toBe("[REDACTED]");
    expect(line.apiKey).toBe("[REDACTED]");
    expect(line.plain).toBe("sichtbar");
  });

  it("never writes a raw secret into the log line", () => {
    const line = formatLogLine("info", "order created", {
      token: "tok_secret_abc",
      correlationId: "corr-1",
    });
    expect(line).not.toContain("tok_secret_abc");
    expect(line).toContain("corr-1");
  });
});