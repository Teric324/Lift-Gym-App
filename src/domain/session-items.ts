import type { DraftItem, DraftRow } from './types';

/** Exercises that are shown in the session (not skipped), in their order. */
export function visibleItems(items: readonly DraftItem[]): DraftItem[] {
  return items.filter((item) => !item.skipped);
}

/**
 * Moves an exercise one place up (-1) or down (+1) among the *visible* exercises, by swapping it
 * with its visible neighbour. Skipped exercises keep their slots, so they come back where they
 * were. Moving past either end changes nothing.
 */
export function moveVisible(
  items: readonly DraftItem[],
  exerciseId: string,
  direction: -1 | 1,
): DraftItem[] {
  const slots = items.flatMap((item, index) => (item.skipped ? [] : [index]));
  const position = slots.findIndex((index) => items[index]?.exerciseId === exerciseId);
  const neighbour = slots[position + direction];
  const own = slots[position];
  const copy = [...items];
  if (position === -1 || own === undefined || neighbour === undefined) return copy;
  [copy[own], copy[neighbour]] = [copy[neighbour]!, copy[own]!];
  return copy;
}

/**
 * The routine exercise a session item stands for, or null when it is not from the routine
 * (it was added today). A replacement stands for the exercise it replaced, however many times
 * it was replaced in a row.
 */
export function routineTargetOf(item: DraftItem): string | null {
  if (item.origin === 'routine') return item.exerciseId;
  if (item.origin === 'replacement') return item.replacesExerciseId;
  return null;
}

export function hasCheckedRows(item: DraftItem): boolean {
  return item.rows.some((row) => row.checkedSetId !== null);
}

/**
 * Replaces `oldExerciseId` by a new exercise in the session item list.
 *
 * - Nothing checked yet: the new exercise takes the old one's place and the old one (with its
 *   unchecked values) is gone.
 * - Some sets checked: they are real work on the old exercise, so it stays with just those rows
 *   and the new exercise is inserted right after it, taking over what was left to do.
 */
export function applyReplacement(
  items: readonly DraftItem[],
  oldExerciseId: string,
  newExerciseId: string,
  newRows: DraftRow[],
): DraftItem[] {
  const index = items.findIndex((item) => item.exerciseId === oldExerciseId);
  const old = items[index];
  if (index === -1 || !old) throw new Error(`Exercise ${oldExerciseId} is not in this session`);

  const replacement: DraftItem = {
    exerciseId: newExerciseId,
    origin: 'replacement',
    replacesExerciseId: routineTargetOf(old),
    skipped: false,
    rows: newRows,
  };

  const copy = [...items];
  if (hasCheckedRows(old)) {
    copy[index] = { ...old, rows: old.rows.filter((row) => row.checkedSetId !== null) };
    copy.splice(index + 1, 0, replacement);
  } else {
    copy[index] = replacement;
  }
  return copy;
}
