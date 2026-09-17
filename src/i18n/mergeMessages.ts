export type Messages = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeMessagesWithGermanFallback(
  german: Messages,
  localized: Messages,
): Messages {
  const merged: Messages = { ...german };
  for (const [key, value] of Object.entries(localized)) {
    if (isRecord(value) && isRecord(german[key])) {
      merged[key] = mergeMessagesWithGermanFallback(german[key] as Messages, value);
    } else if (typeof value === "string") {
      merged[key] = value;
    }
  }
  return merged;
}