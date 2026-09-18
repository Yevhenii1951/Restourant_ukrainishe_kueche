import {
  assertCanManageStaff,
  type Decision,
  StaffDeniedError,
  type StaffRole,
  type StaffContext,
} from "./domain";
import { decideDeactivation, decideRoleChange } from "./domain";
import { toStaffContext } from "./postgresStaffStore";
import type { StaffInvitation, StaffStore } from "./store";

export async function resolveCurrentStaff(
  authUserId: string | null,
  store: StaffStore,
): Promise<StaffContext | null> {
  if (!authUserId) return null;
  const profile = await store.findByAuthUserId(authUserId);
  if (!profile?.active) return null;
  await store.markInvitationAccepted(authUserId);
  return toStaffContext(profile);
}

export class StaffService {
  constructor(
    private readonly store: StaffStore,
    private readonly correlationId: string,
  ) {}

  private async listContexts(): Promise<StaffContext[]> {
    return (await this.store.listStaff()).map(toStaffContext);
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
    await this.store.changeRole(targetId, newRole, {
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
    await this.store.setActive(targetId, active, {
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
    try {
      const created = await this.store.bootstrapAdmin(
        { ...profile, role: "ADMIN" },
        {
          actorId: null,
          action: "staff.bootstrap.admin",
          entityType: "staff_profile",
          afterData: { role: "ADMIN" },
          correlationId: this.correlationId,
        },
      );
      return { ok: true, profileId: created.id };
    } catch (error) {
      if (isConflict(error)) return { ok: false, code: "CONFLICT" };
      throw error;
    }
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
    await this.store.createInvitation(invitation, {
      actorId: actor.id,
      action: "staff.invitation.create",
      entityType: "staff_invitation",
      entityId: invitation.id,
      afterData: { role: invitation.role },
      correlationId: this.correlationId,
    });
    return { ok: true };
  }
}

function isConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("active admin already exists")
  );
}
