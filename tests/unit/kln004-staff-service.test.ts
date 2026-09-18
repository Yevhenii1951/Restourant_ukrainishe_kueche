import { describe, expect, it } from "vitest";
import { StaffService } from "@/features/identity/service";
import type { StaffContext } from "@/features/identity/domain";
import type {
  AuditEventInput,
  NewStaffProfile,
  StaffInvitation,
  StaffProfile,
  StaffStore,
} from "@/features/identity/store";

function context(overrides: Partial<StaffContext>): StaffContext {
  return {
    id: "ctx-1",
    authUserId: "auth-1",
    role: "ADMIN",
    active: true,
    ...overrides,
  };
}

function createMemoryStore() {
  const profiles = new Map<string, StaffProfile>();
  const audits: AuditEventInput[] = [];
  const store: StaffStore = {
    async listStaff() {
      return [...profiles.values()];
    },
    async findByAuthUserId(authUserId) {
      return (
        [...profiles.values()].find((p) => p.authUserId === authUserId) ?? null
      );
    },
    async createProfile(profile: NewStaffProfile) {
      const created: StaffProfile = {
        id: `profile-${profiles.size + 1}`,
        ...profile,
        active: true,
      };
      profiles.set(created.id, created);
      return created;
    },
    async updateRole(profileId, role) {
      profiles.get(profileId)!.role = role;
    },
    async setActive(profileId, active) {
      profiles.get(profileId)!.active = active;
    },
    async createInvitation(invitation: StaffInvitation) {
      invitations.push(invitation);
    },
    async writeAudit(event) {
      audits.push(event);
    },
  };
  const invitations: StaffInvitation[] = [];
  return { store, profiles, audits, invitations };
}

describe("KLN-004 staff service orchestration", () => {
  it("changes role and records an audit event when allowed", async () => {
    const { store, profiles, audits } = createMemoryStore();
    profiles.set("target", {
      id: "target",
      authUserId: "auth-2",
      displayName: "S",
      role: "STAFF",
      active: true,
    });
    const service = new StaffService(store, "corr-1");

    const decision = await service.changeRole(context({}), "target", "MANAGER");

    expect(decision).toEqual({ ok: true });
    expect(profiles.get("target")!.role).toBe("MANAGER");
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("staff.role.change");
    expect(audits[0].correlationId).toBe("corr-1");
  });

  it("refuses to demote the last active admin without touching the store", async () => {
    const { store, profiles, audits } = createMemoryStore();
    profiles.set("ctx-1", {
      id: "ctx-1",
      authUserId: "auth-1",
      displayName: "A",
      role: "ADMIN",
      active: true,
    });
    const service = new StaffService(store, "corr-1");

    const decision = await service.changeRole(context({}), "ctx-1", "STAFF");

    expect(decision).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(profiles.get("ctx-1")!.role).toBe("ADMIN");
    expect(audits).toHaveLength(0);
  });

  it("deactivation of the last admin is refused as CONFLICT", async () => {
    const { store, audits } = createMemoryStore();
    store.listStaff = async () => [
      {
        id: "ctx-1",
        authUserId: "auth-1",
        displayName: "A",
        role: "ADMIN",
        active: true,
      },
    ];
    const service = new StaffService(store, "corr-1");

    const decision = await service.setActiveStatus(context({}), "ctx-1", false);

    expect(decision).toEqual({ ok: false, code: "CONFLICT" });
    expect(audits).toHaveLength(0);
  });

  it("deactivates a non-last admin and records the audit event", async () => {
    const { store, profiles, audits } = createMemoryStore();
    profiles.set("ctx-1", {
      id: "ctx-1",
      authUserId: "auth-1",
      displayName: "A",
      role: "ADMIN",
      active: true,
    });
    profiles.set("ctx-2", {
      id: "ctx-2",
      authUserId: "auth-2",
      displayName: "B",
      role: "ADMIN",
      active: true,
    });
    const service = new StaffService(store, "corr-1");

    const decision = await service.setActiveStatus(context({}), "ctx-2", false);

    expect(decision).toEqual({ ok: true });
    expect(profiles.get("ctx-2")!.active).toBe(false);
    expect(audits[0].action).toBe("staff.active.clear");
  });

  it("only the first admin is bootstrapped; further attempts fail", async () => {
    const { store, profiles, audits } = createMemoryStore();
    const service = new StaffService(store, "corr-1");

    const first = await service.bootstrapAdmin({
      authUserId: "auth-boot",
      displayName: "A",
    });
    expect(first.ok).toBe(true);
    expect(profiles.size).toBe(1);

    const second = await service.bootstrapAdmin({
      authUserId: "auth-boot-2",
      displayName: "B",
    });
    expect(second).toEqual({ ok: false, code: "CONFLICT" });
    expect(profiles.size).toBe(1);
    expect(audits.map((a) => a.action)).toEqual(["staff.bootstrap.admin"]);
  });

  it("inviting staff requires an active ADMIN actor", async () => {
    const { store, audits } = createMemoryStore();
    const service = new StaffService(store, "corr-1");
    const invitation: StaffInvitation = {
      id: "inv-1",
      email: "x@example.com",
      role: "MANAGER",
      tokenHash: "hash",
      expiresAt: new Date("2026-12-31"),
      acceptedAt: null,
      inviterId: "ctx-1",
    };

    const denied = await service.invite(
      context({ role: "MANAGER", active: true }),
      invitation,
    );
    expect(denied).toEqual({ ok: false, code: "FORBIDDEN" });

    const allowed = await service.invite(context({}), invitation);
    expect(allowed).toEqual({ ok: true });
    expect(audits[0].action).toBe("staff.invitation.create");
  });
});
