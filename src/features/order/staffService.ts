// Staff-facing order operations for pickup orders (KLN-012).
// Pure service: performs authorization checks against the current staff
// session, validates the transition input and maps SQL results to typed
// projections. Contains no server-only imports so Vitest can exercise it.
import type { DatabaseRunner } from "@/features/quote/slotsService";
import type { StaffContext } from "@/features/identity/domain";
import { canManageOrders, canExportCustomerData } from "@/features/identity/domain";
import {
  transitionOrderSchema,
  transitionValidation,
  type AppliedTransitionProjection,
  type PickupAcceptingState,
  type StaffOrderDetail,
  type StaffOrderLineProjection,
  type StaffOrderListItem,
  type StaffOrderStatusEvent,
  type TransitionOrderInput,
} from "@/features/order/domain";
import type { OrderState } from "@/features/order/transitions";

export type OrderListResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "orders"; items: StaffOrderListItem[] };

export type OrderDetailResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "not-found" }
  | { status: "order"; order: StaffOrderDetail };

export type TransitionResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "validation-failed"; fieldErrors: Record<string, string[]> }
  | { status: "conflict"; orderNumber: number; state: OrderState; version: number }
  | { status: "illegal-transition" }
  | { status: "applied"; applied: AppliedTransitionProjection };

export type CsvExportResult =
  | { status: "error"; reason: "service-unavailable" }
  | { status: "ok"; csv: string };

export interface OrderStaffServiceDeps {
  pool: DatabaseRunner;
  currentStaff: StaffContext;
  correlationId: string;
}

export interface OrderListRow {
  id: string;
  order_number: string;
  state: OrderState;
  scheduled_for: Date | string;
  total_cents: number;
  version: number;
  guest_name: string | null;
  guest_phone: string | null;
  decided_at: Date | string | null;
  item_count: string;
}

export interface OrderDetailRow extends OrderListRow {
  subtotal_cents: number;
  discount_cents: number;
  tip_cents: number;
  accepted_estimate_minutes: number | null;
}

interface DetailItemRow {
  id: string;
  name_snapshot: string;
  line_total_cents: number;
  quantity: number;
}

interface DetailModifierRow {
  order_item_id: string;
  group_name_snapshot: string;
  option_name_snapshot: string;
  delta_cents: number;
}

interface StatusEventRow {
  from_state: OrderState | null;
  to_state: OrderState;
  reason: string | null;
  actor_name: string | null;
  created_at: Date | string;
}

interface TransitionRow {
  orderNumber: number;
  state: string;
  version: number;
  scheduledFor: string | null;
  estimateMinutes: number | null;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function lineSummary(items: { name: string; quantity: number }[]): string {
  return items.slice(0, 3).map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

export class OrderStaffService {
  constructor(private readonly deps: OrderStaffServiceDeps) {}

  async listActiveOrders(): Promise<OrderListResult> {
    const { pool, currentStaff, correlationId } = this.deps;
    if (!pool || !currentStaff || !correlationId) {
      return { status: "error", reason: "service-unavailable" };
    }
    if (!canManageOrders(currentStaff)) {
      return { status: "error", reason: "service-unavailable" };
    }
    const result = await pool.query<OrderListRow>(
      `SELECT o.id, o.order_number, o.state, o.scheduled_for, o.total_cents, o.version,
              o.guest_name, o.guest_phone, o.updated_at AS decided_at,
              (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       WHERE o.state IN ('pending_confirmation', 'accepted', 'preparing', 'ready')
         AND o.scheduled_for >= (now() AT TIME ZONE 'Europe/Berlin')::date AT TIME ZONE 'Europe/Berlin'
       ORDER BY o.scheduled_for, o.order_number`,
    );
    const items: StaffOrderListItem[] = await Promise.all(
      result.rows.map(async (row) => {
        const itemsRes = await pool.query<{ name_snapshot: string; quantity: number }>(
          "SELECT name_snapshot, quantity FROM order_items WHERE order_id = $1",
          [row.id],
        );
        const lineNames = itemsRes.rows.map((item) => ({ name: item.name_snapshot, quantity: item.quantity }));
        return {
          orderId: row.id,
          orderNumber: Number(row.order_number),
          state: row.state,
          scheduledFor: iso(row.scheduled_for),
          totalCents: row.total_cents,
          version: row.version,
          guestName: row.guest_name,
          guestPhone: row.guest_phone,
          itemCount: Number(row.item_count),
          lineSummary: lineSummary(lineNames),
        };
      }),
    );
    return { status: "orders", items };
  }

  async getOrderDetail(orderId: string): Promise<OrderDetailResult> {
    const { pool, currentStaff, correlationId } = this.deps;
    if (!pool || !currentStaff || !correlationId) {
      return { status: "error", reason: "service-unavailable" };
    }
    if (!canManageOrders(currentStaff)) {
      return { status: "error", reason: "service-unavailable" };
    }
    const result = await pool.query<OrderDetailRow>(
      `SELECT o.id, o.order_number, o.state, o.scheduled_for, o.total_cents, o.version,
              o.guest_name, o.guest_phone, o.updated_at AS decided_at,
              o.subtotal_cents, o.discount_cents, o.tip_cents, o.accepted_estimate_minutes,
              (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o WHERE o.id = $1`,
      [orderId],
    );
    if (result.rows.length === 0) return { status: "not-found" };
    const row = result.rows[0];

    const [itemsRes, modifiersRes, eventsRes] = await Promise.all([
      pool.query<DetailItemRow>(
        "SELECT id, name_snapshot, line_total_cents, quantity FROM order_items WHERE order_id = $1 ORDER BY id",
        [orderId],
      ),
      pool.query<DetailModifierRow>(
        `SELECT om.order_item_id, om.group_name_snapshot, om.option_name_snapshot, om.delta_cents
         FROM order_item_modifiers om
         WHERE om.order_item_id = ANY (SELECT id FROM order_items WHERE order_id = $1)
         ORDER BY om.id`,
        [orderId],
      ),
      pool.query<StatusEventRow>(
        `SELECT se.from_state, se.to_state, se.reason, sp.display_name AS actor_name, se.created_at
         FROM order_status_events se
         LEFT JOIN staff_profiles sp ON sp.id = se.actor
         WHERE se.order_id = $1 ORDER BY se.created_at`,
        [orderId],
      ),
    ]);

    const modifiersByItem = new Map<string, StaffOrderLineProjection["modifiers"]>();
    for (const mod of modifiersRes.rows) {
      const key = mod.order_item_id;
      const list = modifiersByItem.get(key) ?? [];
      list.push({ groupName: mod.group_name_snapshot, optionName: mod.option_name_snapshot, deltaCents: mod.delta_cents });
      modifiersByItem.set(key, list);
    }
    const lines = itemsRes.rows.map((item) => ({
      name: item.name_snapshot,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
      modifiers: modifiersByItem.get(item.id) ?? [],
    }));
    const events: StaffOrderStatusEvent[] = eventsRes.rows.map((event) => ({
      fromState: event.from_state,
      toState: event.to_state,
      reason: event.reason,
      actorName: event.actor_name,
      createdAt: iso(event.created_at),
    }));

    return {
      status: "order",
      order: {
        orderId: row.id,
        orderNumber: Number(row.order_number),
        state: row.state,
        scheduledFor: iso(row.scheduled_for),
        totalCents: row.total_cents,
        version: row.version,
        guestName: row.guest_name,
        guestPhone: row.guest_phone,
        itemCount: Number(row.item_count),
        lineSummary: lineSummary(lines),
        subtotalCents: row.subtotal_cents,
        discountCents: row.discount_cents,
        tipCents: row.tip_cents,
        acceptedEstimateMinutes: row.accepted_estimate_minutes,
        lines,
        events,
      },
    };
  }

  async transitionOrder(input: unknown): Promise<TransitionResult> {
    const { pool, currentStaff, correlationId } = this.deps;
    if (!pool || !currentStaff || !correlationId) {
      return { status: "error", reason: "service-unavailable" };
    }
    if (!canManageOrders(currentStaff)) {
      return { status: "forbidden" };
    }
    const parsed = transitionOrderSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        fieldErrors[key] ??= [];
        fieldErrors[key].push(issue.message);
      }
      return { status: "validation-failed", fieldErrors };
    }
    const target: TransitionOrderInput = parsed.data;
    const businessErrors = transitionValidation(target);
    if (Object.keys(businessErrors).length > 0) {
      return { status: "validation-failed", fieldErrors: businessErrors };
    }

    const result = await pool.query<{ apply_order_transition: TransitionRow | null }>(
      `SELECT apply_order_transition($1::uuid, $2, $3::order_state, $4, $5, $6::uuid, $7)`,
      [
        target.orderId,
        target.expectedVersion,
        target.targetState,
        target.reason || null,
        target.estimateMinutes || null,
        currentStaff.id,
        correlationId,
      ],
    );
    const value = result.rows[0]?.apply_order_transition;
    if (!value) return { status: "not-found" };

    if (value.state === "conflict" || value.state === "invalid") {
      return {
        status: value.state === "conflict" ? "conflict" : "illegal-transition",
        orderNumber: value.orderNumber,
        state: value.state,
        version: value.version,
      } as TransitionResult;
    }
    if (value.state !== "applied") {
      return { status: "illegal-transition" };
    }
    return {
      status: "applied",
      applied: {
        orderNumber: Number(value.orderNumber),
        state: target.targetState as OrderState,
        version: Number(value.version),
        scheduledFor: String(value.scheduledFor),
        estimateMinutes: value.estimateMinutes,
      },
    };
  }

  async setPickupAccepting(enabled: boolean): Promise<
    { status: "error"; reason: "service-unavailable" } | { status: "ok"; accepting: PickupAcceptingState }
  > {
    const { pool, currentStaff, correlationId } = this.deps;
    if (!pool || !currentStaff || !correlationId) {
      return { status: "error", reason: "service-unavailable" };
    }
    if (!canManageOrders(currentStaff)) {
      return { status: "error", reason: "service-unavailable" };
    }
    await pool.query("SELECT set_pickup_accepting_enabled($1::boolean, $2::uuid, $3)", [
      enabled,
      currentStaff.id,
      correlationId,
    ]);
    return { status: "ok", accepting: { enabled } };
  }

  async getPickupAccepting(): Promise<PickupAcceptingState> {
    const { pool } = this.deps;
    const result = await pool.query<{ enabled: string | null }>(
      `SELECT (value #>> '{}')::boolean::text AS enabled FROM settings WHERE key = 'pickup_accepting_enabled'`,
    );
    if (result.rows.length === 0) return { enabled: true };
    return { enabled: result.rows[0].enabled === "true" };
  }

  async exportOrdersCsv(): Promise<CsvExportResult> {
    const { pool, currentStaff, correlationId } = this.deps;
    if (!pool || !currentStaff || !correlationId) {
      return { status: "error", reason: "service-unavailable" };
    }
    if (!canExportCustomerData(currentStaff)) {
      return { status: "error", reason: "service-unavailable" };
    }
    const result = await pool.query<{
      order_number: string;
      created_at: Date | string;
      state: OrderState;
      scheduled_for: Date | string;
      guest_name: string | null;
      guest_phone: string | null;
      total_cents: number;
    }>(
      `SELECT o.order_number, o.created_at, o.state, o.scheduled_for,
              o.guest_name, o.guest_phone, o.total_cents
       FROM orders o
       WHERE o.guest_name IS NOT NULL OR o.guest_phone IS NOT NULL
       ORDER BY o.created_at`,
    );
    const header = ["orderNumber", "createdAt", "state", "scheduledFor", "guestName", "guestPhone", "totalCents"];
    const rows = result.rows.map((row) => [
      String(row.order_number),
      iso(row.created_at),
      row.state,
      iso(row.scheduled_for),
      row.guest_name ?? "",
      row.guest_phone ?? "",
      String(row.total_cents),
    ]);
    const csv = [header, ...rows].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const auditInserted = await pool.query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
       VALUES ($1::uuid, 'order.export.csv', 'order', NULL, NULL, $2, $3)`,
      [currentStaff.id, JSON.stringify({ rows: rows.length }), correlationId],
    );
    if (!auditInserted) return { status: "error", reason: "service-unavailable" };
    return { status: "ok", csv };
  }
}

function csvCell(value: string): string {
  const needsQuote = /["\r\n,]/.test(value);
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return needsQuote ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}