import pg from "pg";

import { createPostgresStaffStore } from "../src/features/identity/postgresStaffStore.ts";
import { StaffService } from "../src/features/identity/service.ts";
import { createCorrelationId } from "../src/lib/correlationId.ts";

const env = process.env as Record<string, string | undefined>;
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for the admin bootstrap.");
  process.exit(1);
}

const authUserId = env.BOOTSTRAP_ADMIN_AUTH_USER_ID;
const displayName = env.BOOTSTRAP_ADMIN_DISPLAY_NAME ?? "Bootstrap Admin";

if (!authUserId) {
  console.error(
    "BOOTSTRAP_ADMIN_AUTH_USER_ID is required (the Supabase auth user id for the first admin).",
  );
  process.exit(1);
}

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
