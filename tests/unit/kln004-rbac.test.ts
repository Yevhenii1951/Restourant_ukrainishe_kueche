import { describe, expect, it } from "vitest";
import {
  assertActive,
  assertCanManageStaff,
  decideDeactivation,
  decideRoleChange,
  StaffDeniedError,
  type StaffContext,
} from "@/features/identity/domain";

function context(overrides: Partial<StaffContext>): StaffContext {
  return {
    id: "profile-1",
    authUserId: "auth-1",
    role: "STAFF",
    active: true,
    ...overrides,
  };
}

describe("KLN-004 staff RBAC rules", () => {
  it("rejects an inactive session even with a valid profile", () => {
    expect(() => assertActive(context({ active: false }))).toThrow(
      StaffDeniedError,
    );
  });

  it("accepts an active session", () => {
    expect(() => assertActive(context({ active: true }))).not.toThrow();
  });

  it("allows only ADMIN to manage staff", () => {
    expect(() =>
      assertCanManageStaff(context({ role: "ADMIN" })),
    ).not.toThrow();
    expect(() => assertCanManageStaff(context({ role: "MANAGER" }))).toThrow(
      StaffDeniedError,
    );
    expect(() => assertCanManageStaff(context({ role: "STAFF" }))).toThrow(
      StaffDeniedError,
    );
    expect(() =>
      assertCanManageStaff(context({ role: "ADMIN", active: false })),
    ).toThrow(StaffDeniedError);
  });

  it("rejects a role change of the actor's own profile", () => {
    const admin = context({ id: "admin-1", role: "ADMIN" });
    expect(decideRoleChange(admin, "admin-1", "MANAGER", [admin])).toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("allows ADMIN to promote an active staff member", () => {
    const admin = context({ id: "admin-1", role: "ADMIN" });
    const staff = context({ id: "staff-1", role: "STAFF" });
    expect(
      decideRoleChange(admin, "staff-1", "MANAGER", [admin, staff]),
    ).toEqual({ ok: true });
  });

  it("denies changing an inactive target", () => {
    const admin = context({ id: "admin-1", role: "ADMIN" });
    const inactive = context({ id: "staff-1", active: false });
    expect(
      decideRoleChange(admin, "staff-1", "MANAGER", [admin, inactive]),
    ).toEqual({ ok: false, code: "CONFLICT" });
  });

  it("rejects deactivating the last active admin", () => {
    const admin = context({ id: "admin-1", role: "ADMIN" });
    expect(decideDeactivation(admin, "admin-1", [admin])).toEqual({
      ok: false,
      code: "CONFLICT",
    });
  });

  it("rejects demoting the last active admin", () => {
    const admin = context({ id: "admin-1", role: "ADMIN" });
    expect(decideRoleChange(admin, "admin-1", "MANAGER", [admin])).toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("allows deactivating an admin when another active admin exists", () => {
    const adminA = context({ id: "admin-a", role: "ADMIN" });
    const adminB = context({ id: "admin-b", role: "ADMIN" });
    expect(decideDeactivation(adminA, "admin-b", [adminA, adminB])).toEqual({
      ok: true,
    });
  });

  it("denies MANAGER invoking the staff-role management action", () => {
    const manager = context({ id: "manager-1", role: "MANAGER" });
    expect(decideRoleChange(manager, "staff-1", "ADMIN", [manager])).toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("denies STAFF invoking the staff-role management action", () => {
    const staff = context({ id: "staff-1", role: "STAFF" });
    expect(decideRoleChange(staff, "staff-2", "MANAGER", [staff])).toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});
