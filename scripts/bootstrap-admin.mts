import pg from "pg";

import { z } from "zod";
import { createPostgresStaffStore } from "../src/features/identity/postgresStaffStore.ts";
import { StaffService } from "../src/features/identity/service.ts";
import { createCorrelationId } from "../src/lib/correlationId.ts";
const bootstrapEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BOOTSTRAP_ADMIN_AUTH_USER_ID: z.string().uuid(),
  BOOTSTRAP_ADMIN_DISPLAY_NAME: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .default("Bootstrap Admin"),
});

const parsed = bootstrapEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "DATABASE_URL, a UUID auth user id, and a valid display name are required.",
  );
  process.exit(1);
}
const databaseUrl = parsed.data.DATABASE_URL;
const authUserId = parsed.data.BOOTSTRAP_ADMIN_AUTH_USER_ID;
const displayName = parsed.data.BOOTSTRAP_ADMIN_DISPLAY_NAME;
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const store = createPostgresStaffStore(client);
  const result = await new StaffService(
    store,
    createCorrelationId(),
  ).bootstrapAdmin({
    authUserId,
    displayName,
  });
  if (!result.ok) {
    console.error(
      "Bootstrap refused: an active ADMIN already exists (code: CONFLICT).",
    );
    process.exit(2);
  }
  console.log(`Bootstrap admin created: profile ${result.profileId}`);
} finally {
  await client.end();
}
