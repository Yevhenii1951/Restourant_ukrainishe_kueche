export const TEST_DATABASE_NAME = "kalyna_test";
export const ALLOWED_TEST_HOSTS = new Set(["localhost", "127.0.0.1"]);
export const FORBIDDEN_HOST_PATTERNS = [/\.supabase\./, /\.supabase\.co\./];
export const ALLOWED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export class DatabaseFuseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseFuseError";
  }
}

export type EnvSource = Record<string, string | undefined>;

export function resolveTestDatabaseUrl(source: EnvSource): string {
  const appEnv = source.APP_ENV ?? source.NODE_ENV;
  if (appEnv !== "test") {
    throw new DatabaseFuseError(
      `integration suite requires APP_ENV=test, got "${appEnv ?? "undefined"}"`
    );
  }

  const url = source.TEST_DATABASE_URL;
  if (!url) {
    throw new DatabaseFuseError(
      "TEST_DATABASE_URL is required for the integration suite; no fallback is allowed"
    );
  }

  const parsed = parsePostgresUrl(url);

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new DatabaseFuseError(
      `TEST_DATABASE_URL must use the postgres protocol, got "${parsed.protocol}"`
    );
  }

  const host = parsed.host;
  if (host && !ALLOWED_TEST_HOSTS.has(host)) {
    if (FORBIDDEN_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      throw new DatabaseFuseError(
        "TEST_DATABASE_URL must not reference a hosted Supabase project"
      );
    }
    throw new DatabaseFuseError(
      `TEST_DATABASE_URL host "${host}" is not a local test host`
    );
  }

  const databaseName = parsed.database;
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new DatabaseFuseError(
      `TEST_DATABASE_URL must reference the "${TEST_DATABASE_NAME}" database, got "${databaseName}"`
    );
  }

  return url;
}

type ParsedPostgresUrl = {
  protocol: string;
  host: string | undefined;
  database: string | undefined;
};

function parsePostgresUrl(url: string): ParsedPostgresUrl {
  const match = /^([a-z][a-z0-9+.-]*):\/\/(?:([^@/]+)@)?([^/]*)\/([^?]*)/.exec(url);
  if (!match) {
    throw new DatabaseFuseError("TEST_DATABASE_URL is not a valid URL");
  }
  const protocol = match[1];
  const authority = match[3];
  const database = match[4];
  const host =
    authority.replace(/:\d+$/, "").split("@").pop() || undefined;
  return { protocol: `${protocol}:`, host, database };
}