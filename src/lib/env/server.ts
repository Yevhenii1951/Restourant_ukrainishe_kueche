import "server-only";
import { parseServerEnv } from "./schemas";

export const serverEnv = parseServerEnv(process.env);