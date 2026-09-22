"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { computeModifierPriceDelta, type PublicMenuItem } from "@/features/menu/domain";
import { formatEuroCents } from "@/lib/format";
import { MIN_LINE_QUANTITY, clampQuantity } from "../domain";
import { useCart } from "../cart-provider";

export default function DishOrderForm({
  item,
  locale,
}: Readonly<{ item: PublicMenuItem; locale: string }>) {
  const { addLine } = useCart();
  const t = useTranslations("menu");
  const orderTranslations = useTranslations("orderForm");
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(MIN_LINE_QUANTITY);
  const [added, setAdded] = useState(false);

  const selectionList = item.modifierGroups.map((group) => ({
    groupId: group.id,
    optionIds: selections[group.id] ?? [],
  }));
  const invalidGroups = item.modifierGroups.filter((group) => {
    const count = (selections[group.id] ?? []).length;
    return count < group.minSelections || count > group.maxSelections;
  });
  const totalCents =
    (item.basePriceCents + computeModifierPriceDelta(item.modifierGroups, selectionList)) * quantity;

  function toggleOption(groupId: string, optionId: string) {
    setAdded(false);
    setSelections((previous) => {
      const current = previous[groupId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...previous, [groupId]: next };
    });
  }

  function addToCart() {
    if (invalidGroups.length > 0) return;
    addLine({
      menuItemId: item.id,
      quantity: clampQuantity(quantity),
      modifierSelections: selectionList,
    });
    setAdded(true);
  }

  return (
    <div className="quick-add-panel mt-4 space-y-4">
      {item.modifierGroups.map((group) => {
        const selectedCount = (selections[group.id] ?? []).length;
        const invalidCount = selectedCount < group.minSelections || selectedCount > group.maxSelections;
        return (
          <fieldset key={group.id}>
            <legend className="flex items-center gap-2 text-sm font-medium">
              {group.name}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  group.required ? "bg-kalyna/10 text-kalyna" : "bg-ink/5 text-ink/60"
                }`}
              >
                {group.required ? t("required") : t("optional")}
              </span>
            </legend>
            <div className="mt-2 space-y-1">
              {group.options.map((option) => {
                const checked = (selections[group.id] ?? []).includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleOption(group.id, option.id)} />
                      {option.name}
                    </span>
                    {option.priceDeltaCents > 0 ? (
                      <span className="text-ink/60">
                        +{formatEuroCents(option.priceDeltaCents, locale)}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <p
              className={`mt-1 text-xs ${invalidCount ? "text-red-700" : "text-ink/55"}`}
              role={invalidCount ? "alert" : undefined}
            >
              {invalidCount
                ? t("selectionHintInvalid", { min: group.minSelections, max: group.maxSelections })
                : t("selectionHint", {
                    count: selectedCount,
                    min: group.minSelections,
                    max: group.maxSelections,
                  })}
            </p>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="sr-only">{orderTranslations("quantityLabel", { quantity })}</span>
          <button
            type="button"
            aria-label={orderTranslations("decreaseQuantity")}
            onClick={() => setQuantity((current) => clampQuantity(current - 1))}
            className="h-9 w-9 rounded-lg border border-ink/15 text-lg font-semibold hover:bg-ink/5"
          >
            −
          </button>
          <span className="min-w-8 text-center font-semibold" aria-hidden="true">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={orderTranslations("increaseQuantity")}
            onClick={() => setQuantity((current) => clampQuantity(current + 1))}
            className="h-9 w-9 rounded-lg border border-ink/15 text-lg font-semibold hover:bg-ink/5"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-ink/75">
            {t("previewTotal", { price: formatEuroCents(totalCents, locale) })}
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={invalidGroups.length > 0}
            className="btn-primary !min-h-10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {orderTranslations("addToCart")}
          </button>
        </div>
      </div>
      {added ? (
        <p role="status" className="text-sm font-medium text-kalyna">
          {orderTranslations("added")}
        </p>
      ) : null}
    </div>
  );
}