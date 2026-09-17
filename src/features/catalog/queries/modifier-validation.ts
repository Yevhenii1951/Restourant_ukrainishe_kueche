import { ModifierGroup, ModifierOption } from "./modifier";

export function validateModifierSelection(
  group: ModifierGroup,
  selected: ModifierOption[],
): boolean {
  const count = selected.length;
  return count >= group.min && count <= group.max && (!group.required || count > 0);
}
