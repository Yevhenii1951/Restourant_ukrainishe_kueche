export function assertTestDatabase(url?: string): never | void {
  if (!url || url === "") throw new Error("DB_URL missing: no database URL provided");
  if (url.includes("dev") || url.includes("prod")) {
    throw new Error(`DB_URL rejected: ${url} contains development or production marker`);
  }
}
