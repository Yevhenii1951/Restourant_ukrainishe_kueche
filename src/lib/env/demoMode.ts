import "server-only";
import { clientPublicEnv } from "./client";

export function isDemoContentMode(): boolean {
  return clientPublicEnv.NEXT_PUBLIC_DEMO === "true";
}