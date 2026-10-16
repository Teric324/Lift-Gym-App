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
 * Moves an exercise to `toIndex` among the *visible* exercises (the position it ends up at).
 * Skipped exercises keep their slots in the full list, so they come back where they were. An
 * unknown exercise or an index outside the list is clamped / ignored.
 */
export function moveVisibleTo(
  items: readonly DraftItem[],
  exerciseId: string,
  toIndex: number,
): DraftItem[] {
  const slots = items.flatMap((item, index) => (item.skipped ? [] : [index]));
  const visible = slots.map((index) => items[index]!);
  const from = visible.findIndex((item) => item.exerciseId === exerciseId);
  const copy = [...items];
  if (from === -1) return copy;
  const to = Math.min(Math.max(Math.trunc(toIndex), 0), visible.length - 1);
  const [moved] = visible.splice(from, 1);
  visible.splice(to, 0, moved!);
  slots.forEach((slot, i) => {
    copy[slot] = visible[i]!;
  });
  return copy;
}

export interface ItemProgress {
  /** Rows that are checked (stored sets). */
  checked: number;
  total: number;
  /** The last checked row in row order, or null when none is checked. */
  last: { weightGrams: number; reps: number } | null;
  /** At least one row and all of them checked. */
  done: boolean;
}

/** What the overview shows for an exercise: how far along it is, and its last checked set. */
export function itemProgress(item: DraftItem): ItemProgress {
  const checkedRows = item.rows.filter((row) => row.checkedSetId !== null);
  const lastRow = checkedRows.at(-1);
  const last =
    lastRow && lastRow.weightGrams !== null && lastRow.reps !== null
      ? { weightGrams: lastRow.weightGrams, reps: lastRow.reps }
      : null;
  return {
    checked: checkedRows.length,
    total: item.rows.length,
    last,
    done: item.rows.length > 0 && checkedRows.length === item.rows.length,
  };
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
