import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StaffRole } from "./domain";
import {
  AuditEventInput,
  NewStaffProfile,
  StaffInvitation,
  StaffProfile,
  StaffStore,
} from "./store";

type StaffRow = {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: string;
  active: boolean;
};

function rowToProfile(row: StaffRow): StaffProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    role: row.role as StaffRole,
    active: row.active,
  };
}

export function createQueryableSupabaseStaffStore(
  db: SupabaseClient
): StaffStore {
  return {
    async listStaff(): Promise<StaffProfile[]> {
      const { data, error } = await db
        .from("staff_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as StaffRow[]).map(rowToProfile);
    },

    async findByAuthUserId(authUserId: string): Promise<StaffProfile | null> {
      const { data, error } = await db
        .from("staff_profiles")
        .select("*")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToProfile(data as StaffRow) : null;
    },

    async createProfile(profile: NewStaffProfile): Promise<StaffProfile> {
      const { data, error } = await db
        .from("staff_profiles")
        .insert({
          auth_user_id: profile.authUserId,
          display_name: profile.displayName,
          role: profile.role,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToProfile(data as StaffRow);
    },

    async updateRole(profileId: string, role: StaffRole): Promise<void> {
      const { error } = await db
        .from("staff_profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", profileId);
      if (error) throw error;
    },

    async setActive(profileId: string, active: boolean): Promise<void> {
      const { error } = await db
        .from("staff_profiles")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", profileId);
      if (error) throw error;
    },

    async createInvitation(invitation: StaffInvitation): Promise<void> {
      const { error } = await db.from("staff_invitations").insert({
        email: invitation.email,
        role: invitation.role,
        token_hash: invitation.tokenHash,
        expires_at: invitation.expiresAt.toISOString(),
        inviter_id: invitation.inviterId,
      });
      if (error) throw error;
    },

    async writeAudit(event: AuditEventInput): Promise<void> {
      const { error } = await db.from("audit_events").insert({
        actor_id: event.actorId,
        action: event.action,
        entity_type: event.entityType,
        entity_id: event.entityId ?? null,
        before_data: event.beforeData ?? null,
        after_data: event.afterData ?? null,
        correlation_id: event.correlationId,
      });
      if (error) throw error;
    },
  };
}