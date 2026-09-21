import "server-only";
import type { Pool } from "pg";
import type { ReservationReadStore } from "./availability";
import type {
  BlockingIntervalInput,
  ReservationAccessConfig,
  ReservationClosureInput,
  ReservationWindowInput,
} from "./domain";
import type { ReservationCombinationRow, ReservationTableRow } from "./store";

const SETTING_KEYS = [
  "reservation_duration_minutes",
  "reservation_horizon_days",
  "reservation_notice_minutes",
  "reservation_slot_interval_minutes",
  "reservation_max_party",
] as const;

type SettingRow = { key: string; value: unknown };
type TableRow = { id: string; internal_label: string; capacity: number; area: string; active: boolean };
type CombinationRow = { id: string; name: string; capacity: number | null; active: boolean; member_table_ids: string[] | null };
type WindowRow = { weekday: number | null; date_override: string | null; opens_at: string; closes_at: string; active: boolean };
type ClosureRow = { starts_at: Date; ends_at: Date; affected_services: string[] };
type BlockRow = { starts_at: Date; ends_at: Date; table_id: string };

export function createPostgresReservationStore(db: Pool): ReservationReadStore {
  return {
    async getReservationConfig(): Promise<ReservationAccessConfig | null> {
      const result = await db.query<SettingRow>("SELECT key, value FROM settings WHERE key = ANY($1)", [SETTING_KEYS]);
      const values = Object.fromEntries(result.rows.filter((row) => typeof row.value === "number").map((row) => [row.key, row.value])) as Record<string, number>;
      if (SETTING_KEYS.some((key) => typeof values[key] !== "number")) return null;
      return { durationMinutes: values.reservation_duration_minutes, horizonDays: values.reservation_horizon_days, noticeMinutes: values.reservation_notice_minutes, slotIntervalMinutes: values.reservation_slot_interval_minutes, maxPartySize: values.reservation_max_party };
    },
    async listTables(): Promise<ReservationTableRow[]> {
      const result = await db.query<TableRow>("SELECT id, internal_label, capacity, area, active FROM restaurant_tables ORDER BY internal_label");
      return result.rows.map((row) => ({ id: row.id, internalLabel: row.internal_label, capacity: row.capacity, area: row.area, active: row.active }));
    },
    async listCombinations(): Promise<ReservationCombinationRow[]> {
      const result = await db.query<CombinationRow>(
        `SELECT c.id, c.name, c.capacity, c.active, array_agg(m.table_id ORDER BY m.table_id) FILTER (WHERE m.table_id IS NOT NULL) AS member_table_ids
         FROM table_combinations c LEFT JOIN table_combination_members m ON m.combination_id = c.id
         GROUP BY c.id ORDER BY c.name`,
      );
      return result.rows.map((row) => ({ id: row.id, name: row.name, capacity: row.capacity ?? 0, active: row.active, memberTableIds: row.member_table_ids ?? [] }));
    },
    async listReservationWindows(): Promise<ReservationWindowInput[]> {
      const result = await db.query<WindowRow>("SELECT weekday, date_override::text, opens_at::text, closes_at::text, active FROM service_windows WHERE fulfilment = 'reservation'");
      return result.rows.map((row) => ({ weekday: row.weekday, dateOverride: row.date_override, opensAt: row.opens_at.slice(0, 5), closesAt: row.closes_at.slice(0, 5), active: row.active }));
    },
    async listReservationClosures(): Promise<ReservationClosureInput[]> {
      const result = await db.query<ClosureRow>("SELECT starts_at, ends_at, affected_services FROM closures WHERE 'reservation' = ANY(affected_services)");
      return result.rows.map((row) => ({ startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(), affectedServices: row.affected_services }));
    },
    async listReservationBlocks(): Promise<BlockingIntervalInput[]> {
      const result = await db.query<BlockRow>(
        `SELECT a.starts_at, a.ends_at, a.table_id FROM reservation_allocations a
         JOIN reservations r ON r.id = a.reservation_id
         WHERE a.blocked AND r.status IN ('pending', 'confirmed')`,
      );
      return result.rows.map((row) => ({ startsAtMs: row.starts_at.getTime(), endsAtMs: row.ends_at.getTime(), tableIds: [row.table_id] }));
    },
  };
}
