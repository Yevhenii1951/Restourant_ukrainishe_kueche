import { describe, expect, it } from "vitest";
import { resolveCurrentStaff } from "@/features/identity/service";
import type { StaffProfile, StaffStore } from "@/features/identity/store";

function createStore(profile: StaffProfile | null): StaffStore {
  return {
    listStaff: async () => [],
    findByAuthUserId: async () => profile,
    changeRole: async () => undefined,
    setActive: async () => undefined,
    createInvitation: async () => undefined,
    bootstrapAdmin: async () => {
      throw new Error("not used");
    },
  };
}

describe("KLN-004 staff session", () => {
  it("returns only an active staff profile for the verified auth subject", async () => {
    const profile: StaffProfile = {
      id: "profile-1",
      authUserId: "auth-1",
      displayName: "Admin",
      role: "ADMIN",
      active: true,
    };

    await expect(
      resolveCurrentStaff("auth-1", createStore(profile)),
    ).resolves.toEqual({
      id: "profile-1",
      authUserId: "auth-1",
      role: "ADMIN",
      active: true,
    });
    await expect(
      resolveCurrentStaff("auth-1", createStore({ ...profile, active: false })),
    ).resolves.toBeNull();
    await expect(
      resolveCurrentStaff(null, createStore(profile)),
    ).resolves.toBeNull();
  });
});
