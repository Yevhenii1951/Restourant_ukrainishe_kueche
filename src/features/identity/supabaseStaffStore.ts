import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStaffProfile, type StaffProfile, type StaffStore } from "./store";

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

export function createSupabaseStaffStore(db: SupabaseClient): StaffStore {
  return {
    async listStaff(): Promise<StaffProfile[]> {
      const { data, error } = await db
        .from("staff_profiles")
        .select("id, auth_user_id, display_name, role, active")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as StaffRow[]).map(rowToProfile);
    },

    async findByAuthUserId(authUserId): Promise<StaffProfile | null> {
      const { data, error } = await db
        .from("staff_profiles")
        .select("id, auth_user_id, display_name, role, active")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToProfile(data as StaffRow) : null;
    },

    async changeRole(profileId, role, audit): Promise<void> {
      const { error } = await db.rpc("change_staff_role_with_audit", {
        target_id: profileId,
        new_role: role,
        audit_actor_id: audit.actorId,
        audit_correlation_id: audit.correlationId,
      });
      if (error) throw error;
    },

    async setActive(profileId, active, audit): Promise<void> {
      const { error } = await db.rpc("set_staff_active_with_audit", {
        target_id: profileId,
        new_active: active,
        audit_actor_id: audit.actorId,
        audit_correlation_id: audit.correlationId,
      });
      if (error) throw error;
    },

    async createInvitation(invitation, audit): Promise<void> {
      const { error } = await db.rpc("create_staff_invitation_with_audit", {
        invitation_id: invitation.id,
        invitation_email: invitation.email,
        invitation_role: invitation.role,
        invitation_token_hash: invitation.tokenHash,
        invitation_expires_at: invitation.expiresAt.toISOString(),
        invitation_inviter_id: invitation.inviterId,
        audit_correlation_id: audit.correlationId,
      });
      if (error) throw error;
    },

    async bootstrapAdmin(profile, audit): Promise<StaffProfile> {
      const { data, error } = await db
        .rpc("bootstrap_staff_admin", {
          admin_auth_user_id: profile.authUserId,
          admin_display_name: profile.displayName,
          audit_correlation_id: audit.correlationId,
        })
        .single();
      if (error) throw error;
      return rowToProfile(data as StaffRow);
    },
  };
}
