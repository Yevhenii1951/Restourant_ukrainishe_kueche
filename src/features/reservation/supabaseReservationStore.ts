import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BlockingIntervalInput,
  ReservationAccessConfig,
  ReservationClosureInput,
  ReservationWindowInput,
} from "./domain";
import type {
  ReservationCombinationRow,
  ReservationCombinationWrite,
  ReservationStore,
  ReservationTableRow,
  ReservationTableWrite,
} from "./store";

const TABLE_COLUMNS = "id, internal_label, capacity, area, active";
const COMBINATION_COLUMNS = "id, name, capacity, active";

const RESERVATION_SETTING_KEYS = [
  "reservation_duration_minutes",
  "reservation_horizon_days",
  "reservation_notice_minutes",
  "reservation_slot_interval_minutes",
  "reservation_max_party",
] as const;

interface TableApiRow extends Record<string, unknown> {
  id: string;
  internal_label: string;
  capacity: number;
  area: string;
  active: boolean;
}

interface CombinationApiRow extends Record<string, unknown> {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
}

function mapTableRow(row: TableApiRow): ReservationTableRow {
  return {
    id: row.id,
    internalLabel: row.internal_label,
    capacity: row.capacity,
    area: row.area,
    active: row.active,
  };
}

export function createSupabaseReservationStore(db: SupabaseClient): ReservationStore {
  return {
    async getReservationConfig(): Promise<ReservationAccessConfig | null> {
      const result = await db
        .from("settings")
        .select("key, value")
        .in("key", [...RESERVATION_SETTING_KEYS]);
      if (result.error) throw result.error;
      const rows: Record<string, unknown> = {};
      for (const item of (result.data ?? []) as Array<{ key: string; value: unknown }>) {
        rows[item.key] = item.value;
      }
      if (![...RESERVATION_SETTING_KEYS].every((key) => typeof rows[key] === "number")) {
        return null;
      }
      return {
        durationMinutes: rows.reservation_duration_minutes as number,
        horizonDays: rows.reservation_horizon_days as number,
        noticeMinutes: rows.reservation_notice_minutes as number,
        slotIntervalMinutes: rows.reservation_slot_interval_minutes as number,
        maxPartySize: rows.reservation_max_party as number,
      };
    },

    async listReservationWindows(): Promise<ReservationWindowInput[]> {
      const result = await db
        .from("service_windows")
        .select("weekday, date_override, opens_at, closes_at, active")
        .eq("fulfilment", "reservation");
      if (result.error) throw result.error;
      return ((result.data ?? []) as Array<{
        weekday: number | null;
        date_override: string | null;
        opens_at: string;
        closes_at: string;
        active: boolean;
      }>).map((row) => ({
        weekday: row.weekday,
        dateOverride: row.date_override,
        opensAt: row.opens_at.slice(0, 5),
        closesAt: row.closes_at.slice(0, 5),
        active: row.active,
      }));
    },

    async listReservationClosures(): Promise<ReservationClosureInput[]> {
      const result = await db.from("closures").select("starts_at, ends_at, affected_services");
      if (result.error) throw result.error;
      return ((result.data ?? []) as Array<{
        starts_at: string;
        ends_at: string;
        affected_services: string[];
      }>)
        .filter((row) => row.affected_services.includes("reservation"))
        .map((row) => ({
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          affectedServices: row.affected_services,
        }));
    },

    async listReservationBlocks(): Promise<BlockingIntervalInput[]> {
      const result = await db
        .from("reservation_allocations")
        .select("table_id, starts_at, ends_at")
        .eq("blocked", true)
        .in("reservations.status", ["pending", "confirmed"]);
      if (result.error) throw result.error;
      return ((result.data ?? []) as Array<{
        table_id: string;
        starts_at: string;
        ends_at: string;
      }>).map((row) => ({
        startsAtMs: Date.parse(row.starts_at),
        endsAtMs: Date.parse(row.ends_at),
        tableIds: [row.table_id],
      }));
    },

    async listTables(): Promise<ReservationTableRow[]> {
      const result = await db
        .from("restaurant_tables")
        .select(TABLE_COLUMNS)
        .order("internal_label");
      if (result.error) throw result.error;
      return ((result.data ?? []) as TableApiRow[]).map(mapTableRow);
    },

    async saveTable(input: ReservationTableWrite): Promise<ReservationTableRow> {
      const payload = {
        internal_label: input.internalLabel,
        capacity: input.capacity,
        area: input.area,
        active: input.active,
      };
      const result = input.id
        ? await db
            .from("restaurant_tables")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", input.id)
            .select(TABLE_COLUMNS)
            .single()
        : await db.from("restaurant_tables").insert(payload).select(TABLE_COLUMNS).single();
      if (result.error) throw result.error;
      return mapTableRow(result.data as TableApiRow);
    },

    async listCombinations(): Promise<ReservationCombinationRow[]> {
      const result = await db.from("table_combinations").select(COMBINATION_COLUMNS).order("name");
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as CombinationApiRow[];
      const memberships = await db
        .from("table_combination_members")
        .select("combination_id, table_id");
      if (memberships.error) throw memberships.error;
      const byCombination = new Map<string, string[]>();
      for (const membership of (memberships.data ?? []) as Array<{
        combination_id: string;
        table_id: string;
      }>) {
        byCombination.set(membership.combination_id, [
          ...(byCombination.get(membership.combination_id) ?? []),
          membership.table_id,
        ]);
      }
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        capacity: row.capacity,
        active: row.active,
        memberTableIds: byCombination.get(row.id) ?? [],
      }));
    },

    async saveCombination(input: ReservationCombinationWrite): Promise<ReservationCombinationRow> {
      let combinationId = input.id;
      if (!combinationId) {
        const created = await db
          .from("table_combinations")
          .insert({ name: input.name, active: input.active })
          .select("id")
          .single();
        if (created.error) throw created.error;
        combinationId = (created.data as { id: string }).id;
      } else {
        const updated = await db
          .from("table_combinations")
          .update({ name: input.name, active: input.active, updated_at: new Date().toISOString() })
          .eq("id", combinationId);
        if (updated.error) throw updated.error;
      }

      const removed = await db
        .from("table_combination_members")
        .delete()
        .eq("combination_id", combinationId);
      if (removed.error) throw removed.error;

      const memberRows = [...new Set(input.memberTableIds)].map((tableId) => ({
        combination_id: combinationId,
        table_id: tableId,
      }));
      if (memberRows.length > 0) {
        const inserted = await db.from("table_combination_members").insert(memberRows);
        if (inserted.error) throw inserted.error;
      }

      const row = await db
        .from("table_combinations")
        .select(COMBINATION_COLUMNS)
        .eq("id", combinationId)
        .single();
      if (row.error) throw row.error;
      const data = row.data as CombinationApiRow;
      return {
        id: data.id,
        name: data.name,
        capacity: data.capacity,
        active: data.active,
        memberTableIds: input.memberTableIds,
      };
    },
  };
}
