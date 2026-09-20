import { describe, expect, it } from "vitest";
import type { StaffContext } from "@/features/identity/domain";
import { AdminOperationsService } from "@/features/admin/service";

const staff = (role: StaffContext["role"]): StaffContext => ({
  id: `${role.toLowerCase()}-id`,
  authUserId: `${role.toLowerCase()}-auth`,
  role,
  active: true,
});

class FakeRunner {
  calls: { text: string; params: unknown[] }[] = [];

  async query<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    this.calls.push({ text, params });
    if (text.includes("admin_customer_export")) {
      return { rows: [{ order_number: "7", guest_name: "=danger", guest_phone: "0123" }] as T[] };
    }
    if (text.includes("admin_audit_events")) {
      return { rows: [{ action: "order.export.csv", after_data: { rows: 1 } }] as T[] };
    }
    return { rows: [] as T[] };
  }
}

describe("KLN-022 admin operation boundaries", () => {
  it("allows manager export but never gives staff raw customer or audit data", async () => {
    const staffRunner = new FakeRunner();
    const staffService = new AdminOperationsService({ pool: staffRunner, actor: staff("STAFF") });
    expect(await staffService.exportCustomers()).toEqual({ status: "forbidden" });
    expect(await staffService.listAudit()).toEqual({ status: "forbidden" });
    expect(staffRunner.calls).toHaveLength(0);

    const managerRunner = new FakeRunner();
    const managerService = new AdminOperationsService({ pool: managerRunner, actor: staff("MANAGER") });
    const exported = await managerService.exportCustomers();
    expect(exported).toMatchObject({ status: "exported" });
    if (exported.status === "exported") expect(exported.csv).toContain("'=danger");
    expect(await managerService.listAudit()).toEqual({ status: "forbidden" });
  });

  it("returns audit summaries only to an admin", async () => {
    const runner = new FakeRunner();
    const service = new AdminOperationsService({ pool: runner, actor: staff("ADMIN") });
    await expect(service.listAudit()).resolves.toEqual({
      status: "events",
      events: [{ action: "order.export.csv", afterData: { rows: 1 } }],
    });
  });
});
