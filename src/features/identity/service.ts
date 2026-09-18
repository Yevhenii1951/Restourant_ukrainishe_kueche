import {
  assertCanManageStaff,
  Decision,
  StaffDeniedError,
  StaffRole,
  type StaffContext,
} from "./domain";
import { decideDeactivation, decideRoleChange } from "./domain";
import { toStaffContext } from "./postgresStaffStore";
import type { StaffStore, StaffInvitation } from "./store";

export async function resolveCurrentStaff(
  authUserId: string | null,
  store: StaffStore,
): Promise<StaffContext | null> {
  if (!authUserId) return null;
  const profile = await store.findByAuthUserId(authUserId);
  if (!profile?.active) return null;
  return toStaffContext(profile);
}

export class StaffService {
  constructor(
    private readonly store: StaffStore,
    private readonly correlationId: string,
  ) {}

  private async listContexts(): Promise<StaffContext[]> {
    const profiles = await this.store.listStaff();
    return profiles.map(toStaffContext);
  }

  async changeRole(
    actor: StaffContext,
    targetId: string,
    newRole: StaffRole,
  ): Promise<Decision> {
    const decision = decideRoleChange(
      actor,
      targetId,
      newRole,
      await this.listContexts(),
    );
    if (!decision.ok) return decision;
    await this.store.updateRole(targetId, newRole);
    await this.store.writeAudit({
      actorId: actor.id,
      action: "staff.role.change",
      entityType: "staff_profile",
      entityId: targetId,
      afterData: { role: newRole },
      correlationId: this.correlationId,
    });
    return { ok: true };
  }

  async setActiveStatus(
    actor: StaffContext,
    targetId: string,
    active: boolean,
  ): Promise<Decision> {
    const decision = decideDeactivation(
      actor,
      targetId,
      await this.listContexts(),
    );
    if (!decision.ok) return decision;
    await this.store.setActive(targetId, active);
    await this.store.writeAudit({
      actorId: actor.id,
      action: active ? "staff.active.set" : "staff.active.clear",
      entityType: "staff_profile",
      entityId: targetId,
      afterData: { active },
      correlationId: this.correlationId,
    });
    return { ok: true };
  }

  async bootstrapAdmin(profile: {
    authUserId: string;
    displayName: string;
  }): Promise<Decision & { profileId?: string }> {
    const staff = await this.listContexts();
    if (staff.some((member) => member.active && member.role === "ADMIN")) {
      return { ok: false, code: "CONFLICT" };
    }
    const created = await this.store.createProfile({
      authUserId: profile.authUserId,
      displayName: profile.displayName,
      role: "ADMIN",
    });
    await this.store.writeAudit({
      actorId: created.id,
      action: "staff.bootstrap.admin",
      entityType: "staff_profile",
      entityId: created.id,
      afterData: { role: "ADMIN" },
      correlationId: this.correlationId,
    });
    return { ok: true, profileId: created.id };
  }

  async invite(
    actor: StaffContext,
    invitation: StaffInvitation,
  ): Promise<Decision> {
    try {
      assertCanManageStaff(actor);
    } catch (error) {
      if (error instanceof StaffDeniedError)
        return { ok: false, code: "FORBIDDEN" };
      throw error;
    }
    await this.store.createInvitation(invitation);
    await this.store.writeAudit({
      actorId: actor.id,
      action: "staff.invitation.create",
      entityType: "staff_invitation",
      entityId: invitation.id,
      afterData: { email: invitation.email, role: invitation.role },
      correlationId: this.correlationId,
    });
    return { ok: true };
  }
}
