export type StaffRole = "ADMIN" | "MANAGER" | "STAFF";

export interface StaffProfile {
  id: string;
  email: string;
  role: StaffRole;
  active: boolean;
  invitedBy: string | null;
}
