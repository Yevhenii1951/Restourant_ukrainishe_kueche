import { randomUUID } from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function createCorrelationId(): string {
  return randomUUID();
}

export function parseCorrelationId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > 64) return undefined;
  return CORRELATION_ID_PATTERN.test(trimmed) ? trimmed : undefined;
}