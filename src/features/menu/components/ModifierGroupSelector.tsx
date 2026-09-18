"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  computeModifierPriceDelta,
  type ModifierSelection,
  type PublicModifierGroup,
  validateModifierSelections,
} from "../domain";
import { formatEuroCents } from "@/lib/format";

interface ModifierGroupSelectorProps {
  groups: PublicModifierGroup[];
  basePriceCents: number;
  locale: string;
}

export default function ModifierGroupSelector({
  groups,
  basePriceCents,
  locale,
}: Readonly<ModifierGroupSelectorProps>) {
  const t = useTranslations("menu");
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  if (groups.length === 0) return null;

  const selectionList: ModifierSelection[] = groups.map((group) => ({
    groupId: group.id,
    optionIds: selections[group.id] ?? [],
  }));
  const totalCents = basePriceCents + computeModifierPriceDelta(groups, selectionList);

  function toggleOption(groupId: string, optionId: string) {
    setSelections((previous) => {
      const current = previous[groupId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...previous, [groupId]: next };
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => {
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
                      <input
                        type="checkbox"
                        name={`modifier-${group.id}`}
                        checked={checked}
                        onChange={() => toggleOption(group.id, option.id)}
                      />
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
      <p role="status" className="text-sm font-semibold text-ink">
        {t("previewTotal", { price: formatEuroCents(totalCents, locale) })}
      </p>
    </div>
  );
}