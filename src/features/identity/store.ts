import { z } from "zod";
import { STAFF_ROLES, type StaffRole } from "./domain";

export interface StaffProfile {
  id: string;
  authUserId: string;
  displayName: string;
  role: StaffRole;
  active: boolean;
}

export interface StaffInvitation {
  id: string;
  email: string;
  role: StaffRole;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  inviterId: string;
}

export interface AuditEventInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  correlationId: string;
}

export interface NewStaffProfile {
  authUserId: string;
  displayName: string;
  role: StaffRole;
}

export interface StaffStore {
  listStaff(): Promise<StaffProfile[]>;
  findByAuthUserId(authUserId: string): Promise<StaffProfile | null>;
  changeRole(
    profileId: string,
    role: StaffRole,
    audit: AuditEventInput,
  ): Promise<void>;
  setActive(
    profileId: string,
    active: boolean,
    audit: AuditEventInput,
  ): Promise<void>;
  createInvitation(
    invitation: StaffInvitation,
    audit: AuditEventInput,
  ): Promise<void>;
  bootstrapAdmin(
    profile: NewStaffProfile,
    audit: AuditEventInput,
  ): Promise<StaffProfile>;
}

const staffProfileSchema = z.object({
  id: z.string().uuid(),
  authUserId: z.string().uuid(),
  displayName: z.string().min(1),
  role: z.enum(STAFF_ROLES),
  active: z.boolean(),
});

export function parseStaffProfile(input: unknown): StaffProfile {
  return staffProfileSchema.parse(input);
}
