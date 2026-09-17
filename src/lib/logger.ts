export interface LogMeta {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "email",
  "password",
  "apikey",
  "secret",
  "token",
  "authorization",
  "accesskey",
  "phone",
  "address",
]);

function isSensitiveKey(key: string): boolean {
  for (const sensitive of SENSITIVE_KEYS) {
    if (key.toLowerCase().includes(sensitive)) return true;
  }
  return false;
}

export function redactMeta(meta: LogMeta): LogMeta {
  const result: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (isSensitiveKey(key)) {
      result[key] = "[REDACTED]";
      continue;
    }
    if (value !== null && typeof value === "object") {
      result[key] = redactMeta(value as LogMeta);
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function formatLogLine(
  level: string,
  message: string,
  meta?: LogMeta,
  correlationId?: string,
): string {
  const safe = meta ? redactMeta(meta) : undefined;
  return JSON.stringify({
    level,
    message,
    correlationId,
    time: new Date().toISOString(),
    meta: safe,
  });
}

export function logInfo(message: string, meta?: LogMeta, correlationId?: string): void {
  console.info(formatLogLine("info", message, meta, correlationId));
}

export function logError(message: string, error?: unknown, correlationId?: string): void {
  const meta = error instanceof Error ? { name: error.name, message: error.message } : { error };
  console.error(formatLogLine("error", message, meta, correlationId));
}