"use client";

import { useTranslations } from "next-intl";
import type { PublicMenuItem } from "@/features/menu/domain";
import { formatEuroCents } from "@/lib/format";
import {
  clampQuantity,
  estimateLineTotalCents,
  type CartIssue,
  type CartLine,
} from "../domain";

interface WarenkorbLineProps {
  item: PublicMenuItem | null;
  cartLine: CartLine;
  issues: CartIssue[];
  locale: string;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
  onRepair: () => void;
}

export default function WarenkorbLine({
  item,
  cartLine,
  issues,
  locale,
  onSetQuantity,
  onRemove,
  onRepair,
}: Readonly<WarenkorbLineProps>) {
  const t = useTranslations("cart");

  if (item === null) {
    return (
      <li>
        <article className="space-y-3 rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-red-700">{t("notOnMenu")}</h3>
            <button type="button" onClick={onRemove} className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-ink/5">
              {t("removeLine")}
            </button>
          </div>
        </article>
      </li>
    );
  }

  const selectedOptions: string[] = [];
  for (const selection of cartLine.modifierSelections) {
    const group = item.modifierGroups.find((candidate) => candidate.id === selection.groupId);
    if (!group) continue;
    for (const optionId of selection.optionIds) {
      const option = group.options.find((candidate) => candidate.id === optionId);
      if (option) selectedOptions.push(option.name);
    }
  }

  const hasUnavailableOptions = issues.some((issue) => issue.kind === "unavailable-option");

  return (
    <li>
      <article className="space-y-3 rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold">{item.name}</h3>
            {selectedOptions.length > 0 ? (
              <p className="text-sm text-ink/70">{selectedOptions.join(", ")}</p>
            ) : null}
          </div>
          <button type="button" onClick={onRemove} aria-label={t("removeLine")} className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-ink/5">
            {t("removeTitle")}
          </button>
        </div>

        {issues.length > 0 ? (
          <ul className="space-y-1 text-sm text-red-700" role="alert">
            {issues.map((issue, issueIndex) => (
              <li key={`${issue.kind}-${issueIndex}`}>
                {issue.kind === "too-few-selections"
                  ? t("tooFew", { min: issue.expectedMin, max: issue.expectedMax })
                  : issue.kind === "too-many-selections"
                    ? t("tooMany", { max: issue.expectedMax })
                    : t("unavailableOption")}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="sr-only">{t("quantityLabel", { quantity: cartLine.quantity })}</span>
            <button
              type="button"
              aria-label={t("decreaseQuantity")}
              onClick={() => onSetQuantity(clampQuantity(cartLine.quantity - 1))}
              className="h-9 w-9 rounded-lg border border-ink/15 text-lg font-semibold hover:bg-ink/5"
            >
              −
            </button>
            <span className="min-w-8 text-center font-semibold" aria-hidden="true">
              {cartLine.quantity}
            </span>
            <button
              type="button"
              aria-label={t("increaseQuantity")}
              onClick={() => onSetQuantity(clampQuantity(cartLine.quantity + 1))}
              className="h-9 w-9 rounded-lg border border-ink/15 text-lg font-semibold hover:bg-ink/5"
            >
              +
            </button>
          </div>
          <p className="font-semibold">{formatEuroCents(estimateLineTotalCents(item, cartLine), locale)}</p>
        </div>

        {hasUnavailableOptions ? (
          <button type="button" onClick={onRepair} className="rounded-lg border border-kalyna/30 px-3 py-1.5 text-sm font-medium text-kalyna hover:bg-kalyna/10">
            {t("repairOptions")}
          </button>
        ) : null}
      </article>
    </li>
  );
}