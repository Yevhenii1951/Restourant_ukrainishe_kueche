import { Pool } from "pg";
import type { Client, PoolClient } from "pg";
import type { StaffContext } from "./domain";
import {
  type AuditEventInput,
  parseStaffProfile,
  type StaffProfile,
  type StaffStore,
} from "./store";

type StaffRow = {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: string;
  active: boolean;
};

function rowToProfile(row: StaffRow): StaffProfile {
  return parseStaffProfile({
    id: row.id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
  });
}

async function writeAudit(db: Client, event: AuditEventInput): Promise<void> {
  await db.query(
    `INSERT INTO audit_events
       (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      event.actorId,
      event.action,
      event.entityType,
      event.entityId ?? null,
      event.beforeData ? JSON.stringify(event.beforeData) : null,
      event.afterData ? JSON.stringify(event.afterData) : null,
      event.correlationId,
    ],
  );
}

async function inTransaction<T>(
  db: Client,
  work: () => Promise<T>,
): Promise<T> {
  await db.query("BEGIN");
  try {
    const result = await work();
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

type Db = Client | Pool;

async function withClient<T>(
  db: Db,
  work: (client: Client | PoolClient) => Promise<T>,
): Promise<T> {
  if (db instanceof Pool) {
    const client = await db.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  }
  return work(db);
}

export function createPostgresStaffStore(db: Db): StaffStore {
  return {
    async listStaff(): Promise<StaffProfile[]> {
      return withClient(db, async (client) => {
        const result = await client.query<StaffRow>(
          `SELECT id, auth_user_id, display_name, role, active
           FROM staff_profiles ORDER BY created_at`,
        );
        return result.rows.map(rowToProfile);
      });
    },

    async findByAuthUserId(authUserId): Promise<StaffProfile | null> {
      return withClient(db, async (client) => {
        const result = await client.query<StaffRow>(
          `SELECT id, auth_user_id, display_name, role, active
           FROM staff_profiles WHERE auth_user_id = $1`,
          [authUserId],
        );
        return result.rows[0] ? rowToProfile(result.rows[0]) : null;
      });
    },

    async changeRole(profileId, role, audit): Promise<void> {
      await withClient(db, async (client) => {
        await inTransaction(client, async () => {
          await client.query(
            "UPDATE staff_profiles SET role = $2, updated_at = now() WHERE id = $1",
            [profileId, role],
          );
          await writeAudit(client, audit);
        });
      });
    },

    async setActive(profileId, active, audit): Promise<void> {
      await withClient(db, async (client) => {
        await inTransaction(client, async () => {
          await client.query(
            "UPDATE staff_profiles SET active = $2, updated_at = now() WHERE id = $1",
            [profileId, active],
          );
          await writeAudit(client, audit);
        });
      });
    },

    async createInvitation(invitation, audit): Promise<void> {
      await withClient(db, async (client) => {
        await inTransaction(client, async () => {
          await client.query(
            `INSERT INTO staff_profiles (auth_user_id, display_name, role)
             VALUES ($1, $2, $3)`,
            [invitation.authUserId, invitation.displayName, invitation.role],
          );
          await client.query(
            `INSERT INTO staff_invitations
               (id, auth_user_id, email, role, token_hash, expires_at, accepted_at, inviter_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              invitation.id,
              invitation.authUserId,
              invitation.email,
              invitation.role,
              invitation.tokenHash,
              invitation.expiresAt,
              invitation.acceptedAt,
              invitation.inviterId,
            ],
          );
          await writeAudit(client, audit);
        });
      });
    },

    async markInvitationAccepted(authUserId): Promise<void> {
      await withClient(db, async (client) => {
        await client.query(
          "UPDATE staff_invitations SET accepted_at = COALESCE(accepted_at, now()) WHERE auth_user_id = $1",
          [authUserId],
        );
      });
    },

    async bootstrapAdmin(profile, audit): Promise<StaffProfile> {
      return withClient(db, (client) =>
        inTransaction(client, async () => {
          await client.query(
            "SELECT pg_advisory_xact_lock(hashtext('staff_profiles:bootstrap'))",
          );
          const existing = await client.query(
            "SELECT 1 FROM staff_profiles WHERE active AND role = 'ADMIN' LIMIT 1",
          );
          if (existing.rowCount) throw new Error("active admin already exists");
          const created = await client.query<StaffRow>(
            `INSERT INTO staff_profiles (auth_user_id, display_name, role)
             VALUES ($1, $2, $3)
             RETURNING id, auth_user_id, display_name, role, active`,
            [profile.authUserId, profile.displayName, profile.role],
          );
          const result = rowToProfile(created.rows[0]);
          await writeAudit(client, {
            ...audit,
            actorId: result.id,
            entityId: result.id,
          });
          return result;
        }),
      );
    },
  };
}

export function toStaffContext(profile: StaffProfile): StaffContext {
  return {
    id: profile.id,
    authUserId: profile.authUserId,
    role: profile.role,
    active: profile.active,
  };
}
