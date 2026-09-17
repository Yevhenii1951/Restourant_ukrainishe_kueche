export function logInfo(msg: string, meta?: Record<string, unknown>) {
  console.info(JSON.stringify({ msg, ...meta, time: new Date().toISOString() }));
}
