export const STAFF_ROLES = ["STAFF", "MANAGER", "ADMIN"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_RANK: Record<StaffRole, number> = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export type StaffContext = {
  id: string;
  authUserId: string;
  role: StaffRole;
  active: boolean;
};

export type DenyResult = { ok: false; code: "FORBIDDEN" | "CONFLICT" };
export type AllowResult = { ok: true };
export type Decision = AllowResult | DenyResult;

export class StaffDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffDeniedError";
  }
}

export function assertActive(staff: StaffContext): void {
  if (!staff.active) {
    throw new StaffDeniedError(`Staff session is inactive (profile ${staff.id})`);
  }
}

export function assertCanManageStaff(actor: StaffContext): void {
  assertActive(actor);
  if (actor.role !== "ADMIN") {
    throw new StaffDeniedError(`Role ${actor.role} cannot manage staff`);
  }
}

export function canManageOrders(staff: StaffContext): boolean {
  return staff.active && ROLE_RANK[staff.role] >= ROLE_RANK.STAFF;
}

export function canManageMenu(staff: StaffContext): boolean {
  return staff.active && ROLE_RANK[staff.role] >= ROLE_RANK.MANAGER;
}

export function canManageContent(staff: StaffContext): boolean {
  return staff.active && ROLE_RANK[staff.role] >= ROLE_RANK.MANAGER;
}

export function canExportCustomerData(staff: StaffContext): boolean {
  return staff.active && ROLE_RANK[staff.role] >= ROLE_RANK.MANAGER;
}

export function canManageReservations(staff: StaffContext): boolean {
  return staff.active && ROLE_RANK[staff.role] >= ROLE_RANK.MANAGER;
}

function firstActiveAdminId(admins: StaffContext[]): string | undefined {
  return admins.find((admin) => admin.active && admin.role === "ADMIN")?.id;
}

export function decideRoleChange(
  actor: StaffContext,
  targetId: string,
  newRole: StaffRole,
  activeStaff: StaffContext[]
): Decision {
  if (!actor.active || actor.role !== "ADMIN") {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (actor.id === targetId) {
    return { ok: false, code: "FORBIDDEN" };
  }
  const target = activeStaff.find((staff) => staff.id === targetId);
  if (!target || !target.active) {
    return { ok: false, code: "CONFLICT" };
  }
  if (target.role === "ADMIN" && newRole !== "ADMIN") {
    const lastAdmin =
      firstActiveAdminId(activeStaff) === target.id &&
      activeStaff.filter(
        (staff) => staff.active && staff.role === "ADMIN"
      ).length === 1;
    if (lastAdmin) {
      return { ok: false, code: "FORBIDDEN" };
    }
  }
  return { ok: true };
}

export function decideDeactivation(
  actor: StaffContext,
  targetId: string,
  activeStaff: StaffContext[]
): Decision {
  if (!actor.active || actor.role !== "ADMIN") {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (actor.id === targetId) {
    return { ok: false, code: "CONFLICT" };
  }
  const target = activeStaff.find((staff) => staff.id === targetId);
  if (!target) {
    return { ok: false, code: "CONFLICT" };
  }
  if (target.role === "ADMIN") {
    const adminCount = activeStaff.filter(
      (staff) => staff.active && staff.role === "ADMIN"
    ).length;
    if (adminCount <= 1) {
      return { ok: false, code: "CONFLICT" };
    }
  }
  return { ok: true };
}