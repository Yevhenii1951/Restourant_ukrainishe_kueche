import "server-only";
import { parseClientEnv } from "./schemas";

export const clientPublicEnv = parseClientEnv(process.env);