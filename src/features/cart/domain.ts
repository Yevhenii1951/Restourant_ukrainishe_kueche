import { z } from "zod";
import { computeModifierPriceDelta, type PublicMenuItem } from "@/features/menu/domain";

export const CART_STORAGE_KEY = "kalyna:cart:v1";
export const CART_VERSION = 1;
export const MIN_LINE_QUANTITY = 1;
export const MAX_LINE_QUANTITY = 100;
export const MAX_LINES = 100;
export const MAX_SELECTIONS_PER_GROUP = 50;

const CART_MODIFIER_SELECTION_SCHEMA = z
  .object({
    groupId: z.string().uuid(),
    optionIds: z.array(z.string().uuid()).max(MAX_SELECTIONS_PER_GROUP),
  })
  .strict();

const CART_LINE_SCHEMA = z
  .object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(MIN_LINE_QUANTITY).max(MAX_LINE_QUANTITY),
    modifierSelections: z.array(CART_MODIFIER_SELECTION_SCHEMA),
  })
  .strict();

export const CART_SCHEMA = z
  .object({
    version: z.literal(CART_VERSION),
    lines: z.array(CART_LINE_SCHEMA).max(MAX_LINES),
  })
  .strict();

export type CartLine = z.infer<typeof CART_LINE_SCHEMA>;
export type Cart = z.infer<typeof CART_SCHEMA>;

export function parseCartPayload(raw: unknown): Cart | null {
  const parsed = CART_SCHEMA.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export type CartIssueKind =
  | "not-on-menu"
  | "invalid-quantity"
  | "too-few-selections"
  | "too-many-selections"
  | "unavailable-option";

export type CartIssue =
  | { lineIndex: number; kind: "not-on-menu" }
  | { lineIndex: number; kind: "invalid-quantity"; actual: number }
  | {
      lineIndex: number;
      kind: "too-few-selections";
      groupId: string;
      expectedMin: number;
      expectedMax: number;
      actual: number;
    }
  | {
      lineIndex: number;
      kind: "too-many-selections";
      groupId: string;
      expectedMax: number;
      actual: number;
    }
  | { lineIndex: number; kind: "unavailable-option"; optionId: string };

function uniqueOptionIds(optionIds: string[]): string[] {
  return [...new Set(optionIds)];
}

export function validateCart(
  cart: Cart,
  itemsById: ReadonlyMap<string, PublicMenuItem>,
): CartIssue[] {
  const issues: CartIssue[] = [];

  cart.lines.forEach((cartLine, lineIndex) => {
    const item = itemsById.get(cartLine.menuItemId);
    if (!item) {
      issues.push({ lineIndex, kind: "not-on-menu" });
      return;
    }

    if (cartLine.quantity < MIN_LINE_QUANTITY || cartLine.quantity > MAX_LINE_QUANTITY) {
      issues.push({ lineIndex, kind: "invalid-quantity", actual: cartLine.quantity });
    }

    const groupsById = new Map(item.modifierGroups.map((group) => [group.id, group]));
    const checkedGroups = new Set<string>();

    for (const selection of cartLine.modifierSelections) {
      if (checkedGroups.has(selection.groupId)) continue;

      const group = groupsById.get(selection.groupId);
      if (!group) {
        checkedGroups.add(selection.groupId);
        for (const optionId of uniqueOptionIds(selection.optionIds)) {
          issues.push({ lineIndex, kind: "unavailable-option", optionId });
        }
        continue;
      }
      checkedGroups.add(selection.groupId);

      const validIds = new Set(group.options.map((option) => option.id));
      const selectedOptions = uniqueOptionIds(selection.optionIds).filter((optionId) =>
        validIds.has(optionId),
      );
      const selectedCount = selectedOptions.length;

      if (selectedCount < group.minSelections) {
        issues.push({
          lineIndex,
          kind: "too-few-selections",
          groupId: group.id,
          expectedMin: group.minSelections,
          expectedMax: group.maxSelections,
          actual: selectedCount,
        });
      }
      if (selectedCount > group.maxSelections) {
        issues.push({
          lineIndex,
          kind: "too-many-selections",
          groupId: group.id,
          expectedMax: group.maxSelections,
          actual: selectedCount,
        });
      }
      for (const optionId of uniqueOptionIds(selection.optionIds)) {
        if (!validIds.has(optionId)) {
          issues.push({ lineIndex, kind: "unavailable-option", optionId });
        }
      }
    }

    for (const group of item.modifierGroups) {
      if (checkedGroups.has(group.id) || group.minSelections === 0) continue;
      issues.push({
        lineIndex,
        kind: "too-few-selections",
        groupId: group.id,
        expectedMin: group.minSelections,
        expectedMax: group.maxSelections,
        actual: 0,
      });
    }
  });

  return issues;
}

export function estimateLineTotalCents(item: PublicMenuItem, cartLine: CartLine): number {
  const modifierDelta = computeModifierPriceDelta(item.modifierGroups, cartLine.modifierSelections);
  return (item.basePriceCents + modifierDelta) * cartLine.quantity;
}

export function countCartItems(cart: Cart): number {
  return cart.lines.reduce((total, cartLine) => total + cartLine.quantity, 0);
}

export function clampQuantity(quantity: number): number {
  return Math.min(MAX_LINE_QUANTITY, Math.max(MIN_LINE_QUANTITY, Math.trunc(quantity)));
}

function configurationKey(cartLine: CartLine): string {
  const selections = [...cartLine.modifierSelections]
    .map((selection) => `${selection.groupId}:${[...selection.optionIds].sort().join(",")}`)
    .sort()
    .join(";");
  return `${cartLine.menuItemId}|${selections}`;
}

export function addLineToCart(cart: Cart, cartLine: CartLine): Cart {
  const targetKey = configurationKey(cartLine);
  const existingIndex = cart.lines.findIndex((entry) => configurationKey(entry) === targetKey);

  if (existingIndex === -1) {
    if (cart.lines.length >= MAX_LINES) return cart;
    return { ...cart, lines: [...cart.lines, cartLine] };
  }

  return {
    ...cart,
    lines: cart.lines.map((entry, index) =>
      index === existingIndex
        ? { ...entry, quantity: clampQuantity(entry.quantity + cartLine.quantity) }
        : entry,
    ),
  };
}

export function setLineQuantity(cart: Cart, lineIndex: number, quantity: number): Cart {
  if (lineIndex < 0 || lineIndex >= cart.lines.length) return cart;
  return {
    ...cart,
    lines: cart.lines.map((entry, index) =>
      index === lineIndex ? { ...entry, quantity: clampQuantity(quantity) } : entry,
    ),
  };
}

export function removeLineAt(cart: Cart, lineIndex: number): Cart {
  return { ...cart, lines: cart.lines.filter((_, index) => index !== lineIndex) };
}

export function dropUnavailableSelections(cartLine: CartLine, item: PublicMenuItem): CartLine {
  const groupsById = new Map(item.modifierGroups.map((group) => [group.id, group]));
  const modifierSelections = cartLine.modifierSelections.flatMap((selection) => {
    const group = groupsById.get(selection.groupId);
    if (!group) return [];
    const validIds = new Set(group.options.map((option) => option.id));
    return [{ ...selection, optionIds: uniqueOptionIds(selection.optionIds).filter((id) => validIds.has(id)) }];
  });
  return { ...cartLine, modifierSelections };
}