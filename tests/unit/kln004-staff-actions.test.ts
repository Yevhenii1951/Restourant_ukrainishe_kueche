import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffContext } from "@/features/identity/domain";
import type { StaffProfile, StaffStore } from "@/features/identity/store";

vi.mock("server-only", () => ({}));
vi.mock("@/features/identity/session", () => ({ getCurrentStaff: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({})),
}));
vi.mock("@/features/identity/supabaseStaffStore", () => ({
  createSupabaseStaffStore: vi.fn(),
}));

import { changeStaffRoleAction } from "@/features/identity/staffActions";
import { getCurrentStaff } from "@/features/identity/session";
import { createSupabaseStaffStore } from "@/features/identity/supabaseStaffStore";

const TARGET_ID = "00000000-0000-0000-0000-000000000004";
const ACTOR_ID = "00000000-0000-0000-0000-000000000001";

function actor(role: StaffContext["role"]): StaffContext {
  return { id: ACTOR_ID, authUserId: ACTOR_ID, role, active: true };
}

function createStore(): { store: StaffStore; target: StaffProfile } {
  const target: StaffProfile = {
    id: TARGET_ID,
    authUserId: TARGET_ID,
    displayName: "Target",
    role: "STAFF",
    active: true,
  };
  const store: StaffStore = {
    listStaff: async () => [target],
    findByAuthUserId: async () => null,
    changeRole: async (_profileId, role) => {
      target.role = role;
    },
    setActive: async () => undefined,
    createInvitation: async () => undefined,
    markInvitationAccepted: async () => undefined,
    bootstrapAdmin: async () => target,
  };
  return { store, target };
}

describe("KLN-004 staff role Server Action", () => {
  let store: StaffStore;
  let target: StaffProfile;

  beforeEach(() => {
    ({ store, target } = createStore());
    vi.mocked(createSupabaseStaffStore).mockReturnValue(store);
  });

  it.each(["STAFF", "MANAGER"] as const)(
    "denies a direct %s invocation",
    async (role) => {
      vi.mocked(getCurrentStaff).mockResolvedValue(actor(role));

      await expect(
        changeStaffRoleAction(TARGET_ID, "MANAGER"),
      ).resolves.toMatchObject({
        ok: false,
        code: "FORBIDDEN",
      });
      expect(target.role).toBe("STAFF");
    },
  );

  it("allows a direct ADMIN invocation", async () => {
    vi.mocked(getCurrentStaff).mockResolvedValue(actor("ADMIN"));

    await expect(
      changeStaffRoleAction(TARGET_ID, "MANAGER"),
    ).resolves.toMatchObject({
      ok: true,
      data: { id: TARGET_ID, role: "MANAGER" },
    });
    expect(target.role).toBe("MANAGER");
  });
});
