import { BadRequestException } from '@nestjs/common';
import type { MenuItem, MenuItemModifierGroup, MenuItemModifierOption } from '@repo/db';
import type { ModifierSelectionDto, ModifierSnapshotEntry } from '@repo/types';
import { Decimal } from '@repo/utils';

type MenuItemWithModifiers = MenuItem & {
  modifierGroups: (MenuItemModifierGroup & {
    options: MenuItemModifierOption[];
  })[];
};

export interface ResolvedSelections {
  snapshot: ModifierSnapshotEntry[];
  /** Sum of all selected option price deltas. */
  totalDelta: Decimal;
}

/**
 * Resolve a customer-supplied set of modifier selections against the live
 * menu item, enforcing the group's rules.
 *
 * Throws `BadRequestException` with a specific message on any rule violation:
 *   - unknown group/option ids
 *   - required group with no selection
 *   - selection count outside [minSelect, maxSelect]
 *
 * Returns a snapshot suitable for persisting on `CartItem.modifierSnapshot`
 * plus the price delta to add to the item's base price.
 */
export function resolveModifierSelections(
  item: MenuItemWithModifiers,
  selections: ModifierSelectionDto[],
): ResolvedSelections {
  const selectionByGroup = new Map<string, string[]>();
  for (const sel of selections) {
    if (selectionByGroup.has(sel.groupId)) {
      throw new BadRequestException(`Duplicate selection for modifier group ${sel.groupId}`);
    }
    selectionByGroup.set(sel.groupId, sel.optionIds);
  }

  const groupById = new Map(item.modifierGroups.map((g) => [g.id, g]));

  // Reject selections referencing groups that don't belong to this item.
  for (const groupId of selectionByGroup.keys()) {
    if (!groupById.has(groupId)) {
      throw new BadRequestException(`Modifier group ${groupId} does not belong to item ${item.id}`);
    }
  }

  const snapshot: ModifierSnapshotEntry[] = [];
  let totalDelta = new Decimal(0);

  for (const group of item.modifierGroups) {
    const picked = selectionByGroup.get(group.id) ?? [];

    if (group.isRequired && picked.length === 0) {
      throw new BadRequestException(`Modifier group "${group.name}" is required`);
    }

    if (picked.length < group.minSelect) {
      throw new BadRequestException(
        `Modifier group "${group.name}" requires at least ${group.minSelect} selection(s)`,
      );
    }
    if (picked.length > group.maxSelect) {
      throw new BadRequestException(
        `Modifier group "${group.name}" allows at most ${group.maxSelect} selection(s)`,
      );
    }

    const optionById = new Map(group.options.map((o) => [o.id, o]));
    for (const optionId of picked) {
      const option = optionById.get(optionId);
      if (!option) {
        throw new BadRequestException(
          `Option ${optionId} does not belong to group "${group.name}"`,
        );
      }
      totalDelta = totalDelta.plus(option.priceDelta);
      snapshot.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: option.priceDelta.toFixed(2),
      });
    }
  }

  return { snapshot, totalDelta };
}

/**
 * Stable hash of a modifier selection set, used to collapse duplicate cart
 * lines on guest→authed merge.
 */
export function modifierFingerprint(snapshot: ModifierSnapshotEntry[]): string {
  if (snapshot.length === 0) return '∅';
  return snapshot
    .map((s) => `${s.groupId}:${s.optionId}`)
    .sort()
    .join('|');
}
