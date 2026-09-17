export function logInfo(msg: string, meta?: Record<string, unknown>, correlationId?: string) {
  console.info(JSON.stringify({ msg, correlationId, ...meta, time: new Date().toISOString() }));
}
