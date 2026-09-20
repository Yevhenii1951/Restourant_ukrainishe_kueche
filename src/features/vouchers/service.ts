import type { Pool } from "pg";
import type { SupportedLocale } from "@/features/menu/domain";
import type { StripeCheckoutClient } from "@/features/payments/stripeClient";
import { buyVoucherSchema, type VoucherCheckoutResult, type VoucherProduct } from "./domain";

interface ProductRow {
  id: string;
  name: string;
  denomination_cents: number;
}

interface IntentRow {
  create_voucher_purchase_intent: { status?: string; purchaseId?: string; amountCents?: number };
}

export interface VoucherDeps {
  baseUrl: string;
  paypalEnabled: boolean;
  pool: Pick<Pool, "query">;
  stripe: StripeCheckoutClient;
}

export async function listVoucherProducts(locale: SupportedLocale, pool: Pick<Pool, "query">): Promise<VoucherProduct[]> {
  const column = locale === "en" ? "name_en" : locale === "uk" ? "name_uk" : "name_de";
  const result = await pool.query<ProductRow>(
    `SELECT id, ${column} AS name, denomination_cents FROM voucher_products WHERE active ORDER BY sort_order, denomination_cents`,
  );
  return result.rows.map((row) => ({ id: row.id, name: row.name, denominationCents: row.denomination_cents }));
}

export async function createVoucherCheckout(
  raw: unknown,
  locale: SupportedLocale,
  deps: VoucherDeps,
): Promise<VoucherCheckoutResult> {
  const parsed = buyVoucherSchema.safeParse(raw);
  if (!parsed.success) return { status: "rejected", reason: "input" };
  const input = parsed.data;
  if (input.paymentMethod === "stripe_paypal" && !deps.paypalEnabled) return { status: "rejected", reason: "paypal-unavailable" };

  const intent = await deps.pool.query<IntentRow>("SELECT create_voucher_purchase_intent($1,$2,$3)", [
    input.productId,
    input.buyerEmail,
    locale,
  ]);
  const data = intent.rows[0]?.create_voucher_purchase_intent;
  if (!data?.purchaseId || !data.amountCents) return { status: "rejected", reason: "not-found" };

  try {
    const session = await deps.stripe.createVoucherCheckoutSession({
      amountCents: data.amountCents,
      cancelUrl: new URL(`/${locale}/gutscheine`, deps.baseUrl).toString(),
      currency: "EUR",
      locale,
      paymentMethod: input.paymentMethod,
      purchaseId: data.purchaseId,
      successUrl: new URL(`/${locale}/gutscheine?stripe=return`, deps.baseUrl).toString(),
    });
    await deps.pool.query("SELECT bind_stripe_voucher_payment($1,$2,$3,$4,$5)", [
      data.purchaseId,
      session.id,
      session.url,
      data.amountCents,
      "EUR",
    ]);
    return { status: "checkout", redirectUrl: session.url };
  } catch {
    await deps.pool.query("UPDATE voucher_purchases SET state = 'payment_failed' WHERE id = $1 AND state = 'payment_pending'", [data.purchaseId]);
    return { status: "error", reason: "service-unavailable" };
  }
}
