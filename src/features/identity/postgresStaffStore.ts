import type { Client } from "pg";
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

export function createPostgresStaffStore(db: Client): StaffStore {
  return {
    async listStaff(): Promise<StaffProfile[]> {
      const result = await db.query<StaffRow>(
        `SELECT id, auth_user_id, display_name, role, active
         FROM staff_profiles ORDER BY created_at`,
      );
      return result.rows.map(rowToProfile);
    },

    async findByAuthUserId(authUserId): Promise<StaffProfile | null> {
      const result = await db.query<StaffRow>(
        `SELECT id, auth_user_id, display_name, role, active
         FROM staff_profiles WHERE auth_user_id = $1`,
        [authUserId],
      );
      return result.rows[0] ? rowToProfile(result.rows[0]) : null;
    },

    async changeRole(profileId, role, audit): Promise<void> {
      await inTransaction(db, async () => {
        await db.query(
          "UPDATE staff_profiles SET role = $2, updated_at = now() WHERE id = $1",
          [profileId, role],
        );
        await writeAudit(db, audit);
      });
    },

    async setActive(profileId, active, audit): Promise<void> {
      await inTransaction(db, async () => {
        await db.query(
          "UPDATE staff_profiles SET active = $2, updated_at = now() WHERE id = $1",
          [profileId, active],
        );
        await writeAudit(db, audit);
      });
    },

    async createInvitation(invitation, audit): Promise<void> {
      await inTransaction(db, async () => {
        await db.query(
          `INSERT INTO staff_invitations
             (id, email, role, token_hash, expires_at, accepted_at, inviter_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invitation.id,
            invitation.email,
            invitation.role,
            invitation.tokenHash,
            invitation.expiresAt,
            invitation.acceptedAt,
            invitation.inviterId,
          ],
        );
        await writeAudit(db, audit);
      });
    },

    async bootstrapAdmin(profile, audit): Promise<StaffProfile> {
      return inTransaction(db, async () => {
        await db.query(
          "SELECT pg_advisory_xact_lock(hashtext('staff_profiles:bootstrap'))",
        );
        const existing = await db.query(
          "SELECT 1 FROM staff_profiles WHERE active AND role = 'ADMIN' LIMIT 1",
        );
        if (existing.rowCount) throw new Error("active admin already exists");
        const created = await db.query<StaffRow>(
          `INSERT INTO staff_profiles (auth_user_id, display_name, role)
           VALUES ($1, $2, $3)
           RETURNING id, auth_user_id, display_name, role, active`,
          [profile.authUserId, profile.displayName, profile.role],
        );
        const result = rowToProfile(created.rows[0]);
        await writeAudit(db, {
          ...audit,
          actorId: result.id,
          entityId: result.id,
        });
        return result;
      });
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
