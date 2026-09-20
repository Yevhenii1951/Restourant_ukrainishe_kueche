import { z } from "zod";

export const RESERVATION_SERVICE = "reservation" as const;

export interface ReservationAccessConfig {
  durationMinutes: number;
  horizonDays: number;
  noticeMinutes: number;
  slotIntervalMinutes: number;
  maxPartySize: number;
}

export interface ReservationTableInput {
  id: string;
  internalLabel: string;
  capacity: number;
  area: string;
  active: boolean;
}

export interface ReservationCombinationInput {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
  memberTableIds: string[];
}

export interface ReservationWindowInput {
  weekday: number | null;
  dateOverride: string | null;
  opensAt: string;
  closesAt: string;
  active: boolean;
}

export interface ReservationClosureInput {
  startsAt: string;
  endsAt: string;
  affectedServices: string[];
}

/** One physical table or a named group of tables a party can be seated at. */
export interface AllocationOption {
  kind: "table" | "combination";
  tableIds: string[];
  capacity: number;
}

/**
 * A table (or combination) is blocked for a reservation window when a
 * blocking interval overlaps the half-open range [start, end). Consumers feed
 * the pending/confirmed allocations (KLN-014); nothing blocks in KLN-013.
 */
export interface BlockingIntervalInput {
  startsAtMs: number;
  endsAtMs: number;
  tableIds: string[];
}

export interface ReservationSlot {
  startUtc: string;
  labelLocal: string;
}

export const availabilityRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.coerce.number().int().min(1).max(200),
});

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;

export const tableDraftSchema = z.object({
  internalLabel: z.string().trim().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(200),
  area: z.string().trim().min(1).max(40),
});

export const combinationMembersSchema = z
  .array(z.string().uuid())
  .min(2)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Sitzplätze müssen unterschiedlich sein.",
  });

export const combinationDraftSchema = z.object({
  name: z.string().trim().min(1).max(60),
  memberTableIds: combinationMembersSchema,
});

export type TableDraft = z.infer<typeof tableDraftSchema>;
export type CombinationDraft = z.infer<typeof combinationDraftSchema>;

export interface CombinationValidation {
  ok: boolean;
  capacity?: number;
  errors?: string[];
}

/**
 * Combination seats are recomputed server-side from the active member tables
 * and the membership must be at least two different active tables
 * (FR-RES-2 / KLN-013 AC "Manager CRUD validates combination membership and
 * capacity"). Submitted capacities are always ignored.
 */
export function validateCombination(
  draft: CombinationDraft,
  tables: ReservationTableInput[],
): CombinationValidation {
  const byId = new Map(tables.map((table) => [table.id, table]));
  const members = [...new Set(draft.memberTableIds)];
  if (members.length < 2) {
    return { ok: false, errors: ["Eine Kombination braucht mindestens zwei verschiedene Tische."] };
  }
  const missing = members.filter((id) => !byId.has(id));
  const inactive = members.filter((id) => {
    const table = byId.get(id);
    return table !== undefined && !table.active;
  });
  if (missing.length > 0 || inactive.length > 0) {
    const unknown = missing.length > 0 ? `unbekannte Tische: ${missing.join(", ")}` : "";
    const off = inactive.length > 0 ? `inaktive Tische: ${inactive.join(", ")}` : "";
    return { ok: false, errors: [unknown, off].filter(Boolean) };
  }
  const capacity = members.reduce((sum, id) => sum + byId.get(id)!.capacity, 0);
  return { ok: true, capacity };
}

/** Every active table plus every valid active combination, re-summed. */
export function buildAllocationOptions(
  tables: ReservationTableInput[],
  combinations: ReservationCombinationInput[],
): AllocationOption[] {
  const options: AllocationOption[] = [];
  const byId = new Map(tables.map((table) => [table.id, table]));
  for (const table of tables) {
    if (!table.active) continue;
    options.push({ kind: "table", tableIds: [table.id], capacity: table.capacity });
  }
  for (const combination of combinations) {
    if (!combination.active) continue;
    const members = [...new Set(combination.memberTableIds)].sort();
    if (members.length < 2) continue;
    if (members.some((id) => !byId.has(id) || !byId.get(id)!.active)) continue;
    const capacity = members.reduce((sum, id) => sum + byId.get(id)!.capacity, 0);
    options.push({ kind: "combination", tableIds: members, capacity });
  }
  return options.sort(
    (a, b) =>
      a.capacity - b.capacity ||
      (a.kind === "combination" ? -1 : 1) ||
      a.tableIds[0].localeCompare(b.tableIds[0]),
  );
}

/**
 * Smallest-fit planner: the smallest option that seats the party wins.
 * A combination beats a single table of equal capacity so the standalone
 * table stays available for smaller parties; the deterministic sort
 * resolves all remaining ties.
 */
export function selectSmallestPlan(
  options: AllocationOption[],
  partySize: number,
): AllocationOption | null {
  return options.find((option) => option.capacity >= partySize) ?? null;
}