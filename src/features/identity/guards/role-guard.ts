import { StaffRole } from "@/features/identity/types/staff";

export function hasRole(role: StaffRole, allowed: StaffRole[]): boolean {
  return allowed.includes(role);
}
