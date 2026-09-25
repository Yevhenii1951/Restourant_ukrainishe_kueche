"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PublicMenuItem } from "@/features/menu/domain";
import { formatEuroCents } from "@/lib/format";
import {
  countCartItems,
  dropUnavailableSelections,
  estimateLineTotalCents,
  validateCart,
  type CartIssue,
} from "../domain";
import { useCart } from "../cart-provider";
import WarenkorbLine from "./WarenkorbLine";

export default function WarenkorbClient({
  items,
  locale,
}: Readonly<{ items: PublicMenuItem[]; locale: string }>) {
  const { cart, hydrated, setQuantity, removeLine, updateSelections } = useCart();
  const t = useTranslations("cart");

  if (!hydrated) return null;

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const issues = validateCart(cart, itemsById);
  const totalEstimate = cart.lines.reduce((sum, cartLine) => {
    const item = itemsById.get(cartLine.menuItemId);
    return item ? sum + estimateLineTotalCents(item, cartLine) : sum;
  }, 0);
  const issuesByLine = (lineIndex: number): CartIssue[] =>
    issues.filter((issue) => issue.lineIndex === lineIndex);

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-paper p-6 text-center">
        <h2 className="font-display text-2xl font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-2 text-ink/70">{t("emptyHint")}</p>
        <Link href="/speisekarte" className="mt-4 inline-block rounded-lg bg-kalyna px-4 py-2 font-medium text-white hover:opacity-90">
          {t("menuCta")}
        </Link>
      </div>
    );
  }

  const summary = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink/60">{t("itemCount", { count: countCartItems(cart) })}</span>
        <p className="font-semibold">{formatEuroCents(totalEstimate, locale)}</p>
      </div>
      <p className="text-xs text-ink/55">{t("estimateNote")}</p>
      <Link
        href="/bestellen"
        className="block w-full rounded-lg bg-kalyna px-4 py-2 text-center font-medium text-white hover:opacity-90"
      >
        {t("checkout")}
      </Link>
      <p className="text-xs text-ink/55">{t("checkoutSoon")}</p>
    </div>
  );

  return (
    <>
      {issues.length > 0 ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-display text-lg font-semibold text-red-700">{t("blockedTitle")}</h2>
          <p className="mt-1 text-sm text-red-800">{t("blockedHint")}</p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div>
          <p role="status" aria-live="polite" className="sr-only">
            {t("itemCount", { count: countCartItems(cart) })}
          </p>
          <ul className="space-y-4">
            {cart.lines.map((cartLine, lineIndex) => (
              <WarenkorbLine
                key={`${cartLine.menuItemId}-${lineIndex}`}
                item={itemsById.get(cartLine.menuItemId) ?? null}
                cartLine={cartLine}
                issues={issuesByLine(lineIndex)}
                locale={locale}
                onSetQuantity={(quantity) => setQuantity(lineIndex, quantity)}
                onRemove={() => removeLine(lineIndex)}
                onRepair={() => {
                  const item = itemsById.get(cartLine.menuItemId);
                  if (!item) return;
                  updateSelections(
                    lineIndex,
                    dropUnavailableSelections(cartLine, item).modifierSelections,
                  );
                }}
              />
            ))}
          </ul>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-ink/10 bg-paper p-4">{summary}</div>
        </aside>
      </div>

      <div className="sticky bottom-14 z-30 rounded-2xl border border-ink/10 bg-paper/95 p-4 shadow sm:hidden lg:hidden">
        {summary}
      </div>
    </>
  );
}