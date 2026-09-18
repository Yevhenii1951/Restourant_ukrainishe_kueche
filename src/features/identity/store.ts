import type { StaffRole } from "./domain";

export type StaffProfile = {
  id: string;
  authUserId: string;
  displayName: string;
  role: StaffRole;
  active: boolean;
};

export type StaffInvitation = {
  id: string;
  email: string;
  role: StaffRole;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  inviterId: string;
};

export type AuditEventInput = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  correlationId: string;
};

export type NewStaffProfile = {
  authUserId: string;
  displayName: string;
  role: StaffRole;
};

export type StaffStore = {
  listStaff(): Promise<StaffProfile[]>;
  findByAuthUserId(authUserId: string): Promise<StaffProfile | null>;
  createProfile(profile: NewStaffProfile): Promise<StaffProfile>;
  updateRole(profileId: string, role: StaffRole): Promise<void>;
  setActive(profileId: string, active: boolean): Promise<void>;
  createInvitation(invitation: StaffInvitation): Promise<void>;
  writeAudit(event: AuditEventInput): Promise<void>;
};