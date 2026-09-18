import type { Client } from "pg";
import { StaffRole, type StaffContext } from "./domain";
import {
  AuditEventInput,
  NewStaffProfile,
  StaffProfile,
  StaffStore,
  StaffInvitation,
} from "./store";

function rowToProfile(row: {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: string;
  active: boolean;
}): StaffProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    role: row.role as StaffRole,
    active: row.active,
  };
}

export function createQueryableStaffStore(db: Client): StaffStore {
  return {
    async listStaff(): Promise<StaffProfile[]> {
      const result = await db.query<{
        id: string;
        auth_user_id: string;
        display_name: string;
        role: string;
        active: boolean;
      }>(
        `SELECT id, auth_user_id, display_name, role, active
         FROM staff_profiles
         ORDER BY created_at`
      );
      return result.rows.map(rowToProfile);
    },

    async findByAuthUserId(authUserId: string): Promise<StaffProfile | null> {
      const result = await db.query<{
        id: string;
        auth_user_id: string;
        display_name: string;
        role: string;
        active: boolean;
      }>(
        `SELECT id, auth_user_id, display_name, role, active
         FROM staff_profiles
         WHERE auth_user_id = $1`,
        [authUserId]
      );
      return result.rows[0] ? rowToProfile(result.rows[0]) : null;
    },

    async createProfile(profile: NewStaffProfile): Promise<StaffProfile> {
      const result = await db.query<{
        id: string;
        auth_user_id: string;
        display_name: string;
        role: string;
        active: boolean;
      }>(
        `INSERT INTO staff_profiles (auth_user_id, display_name, role)
         VALUES ($1, $2, $3)
         RETURNING id, auth_user_id, display_name, role, active`,
        [profile.authUserId, profile.displayName, profile.role]
      );
      return rowToProfile(result.rows[0]);
    },

    async updateRole(profileId: string, role: StaffRole): Promise<void> {
      await db.query(`UPDATE staff_profiles SET role = $2, updated_at = now() WHERE id = $1`, [
        profileId,
        role,
      ]);
    },

    async setActive(profileId: string, active: boolean): Promise<void> {
      await db.query(`UPDATE staff_profiles SET active = $2, updated_at = now() WHERE id = $1`, [
        profileId,
        active,
      ]);
    },

    async createInvitation(invitation: StaffInvitation): Promise<void> {
      await db.query(
        `INSERT INTO staff_invitations (email, role, token_hash, expires_at, inviter_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          invitation.email,
          invitation.role,
          invitation.tokenHash,
          invitation.expiresAt,
          invitation.inviterId,
        ]
      );
    },

    async writeAudit(event: AuditEventInput): Promise<void> {
      await db.query(
        `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          event.actorId,
          event.action,
          event.entityType,
          event.entityId ?? null,
          event.beforeData ? JSON.stringify(event.beforeData) : null,
          event.afterData ? JSON.stringify(event.afterData) : null,
          event.correlationId,
        ]
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