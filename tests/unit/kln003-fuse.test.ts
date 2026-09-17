import { describe, expect, it } from "vitest";
import {
  DatabaseFuseError,
  resolveTestDatabaseUrl,
} from "@/lib/db/fuse";

describe("database fuse", () => {
  it("rejects an absent test database URL instead of falling back", () => {
    expect(() =>
      resolveTestDatabaseUrl({ APP_ENV: "test", TEST_DATABASE_URL: undefined })
    ).toThrow(DatabaseFuseError);
  });

  it("rejects a development APP_ENV", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "development",
        TEST_DATABASE_URL: "postgresql://user@localhost:5432/kalyna_test",
      })
    ).toThrow(/APP_ENV/i);
  });

  it("rejects a production APP_ENV", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "production",
        TEST_DATABASE_URL: "postgresql://user@localhost:5432/kalyna_test",
      })
    ).toThrow(/APP_ENV/i);
  });

  it("rejects a hosted Supabase ref URL for the test database", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "test",
        TEST_DATABASE_URL: "postgresql://postgres:password@db.xqjxhuhxjlxwbzpbodii.supabase.co:5432/postgres",
      })
    ).toThrow(/supabase/i);
  });

  it("rejects a non-postgres protocol", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "test",
        TEST_DATABASE_URL: "mysql://user@localhost/kalyna_test",
      })
    ).toThrow(/protocol/i);
  });

  it("rejects a malformed test database URL", () => {
    expect(() =>
      resolveTestDatabaseUrl({ APP_ENV: "test", TEST_DATABASE_URL: "not-a-url" })
    ).toThrow(/valid URL/i);
  });

  it("accepts a local socket URL only when APP_ENV is test", () => {
    expect(
      resolveTestDatabaseUrl({
        APP_ENV: "test",
        TEST_DATABASE_URL: "postgresql://dci-student@/kalyna_test?host=/var/run/postgresql",
      })
    ).toBe("postgresql://dci-student@/kalyna_test?host=/var/run/postgresql");
  });

  it("rejects a local socket URL when the database name is not the test database", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        APP_ENV: "test",
        TEST_DATABASE_URL: "postgresql://dci-student@/postgres?host=/var/run/postgresql",
      })
    ).toThrow(/database/i);
  });
});