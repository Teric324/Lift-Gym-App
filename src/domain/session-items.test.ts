import { describe, expect, it } from 'vitest';
import {
  applyReplacement,
  hasCheckedRows,
  moveVisible,
  routineTargetOf,
  visibleItems,
} from './session-items';
import type { DraftItem, DraftRow } from './types';

const row = (id: string, checked = false): DraftRow => ({
  id,
  weightGrams: 80000,
  reps: 5,
  checkedSetId: checked ? `set-${id}` : null,
});

const item = (exerciseId: string, over: Partial<DraftItem> = {}): DraftItem => ({
  exerciseId,
  origin: 'routine',
  replacesExerciseId: null,
  skipped: false,
  rows: [],
  ...over,
});

const ids = (items: readonly DraftItem[]) => items.map((i) => i.exerciseId);

describe('visibleItems', () => {
  it('leaves out skipped exercises and keeps the order', () => {
    const items = [item('a'), item('b', { skipped: true }), item('c')];
    expect(ids(visibleItems(items))).toEqual(['a', 'c']);
  });
});

describe('moveVisible', () => {
  const items = [item('a'), item('b'), item('c')];

  it('moves down and up by one', () => {
    expect(ids(moveVisible(items, 'a', 1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveVisible(items, 'c', -1))).toEqual(['a', 'c', 'b']);
  });

  it('does nothing at the ends or for an unknown exercise', () => {
    expect(ids(moveVisible(items, 'a', -1))).toEqual(['a', 'b', 'c']);
    expect(ids(moveVisible(items, 'c', 1))).toEqual(['a', 'b', 'c']);
    expect(ids(moveVisible(items, 'zzz', 1))).toEqual(['a', 'b', 'c']);
  });

  it('swaps with the next visible exercise and leaves skipped ones in their slots', () => {
    const withSkipped = [item('a'), item('s', { skipped: true }), item('b')];
    const moved = moveVisible(withSkipped, 'b', -1);
    expect(ids(moved)).toEqual(['b', 's', 'a']);
    expect(moved[1]?.skipped).toBe(true);
  });

  it('does not change the input array', () => {
    const input = [item('a'), item('b')];
    moveVisible(input, 'a', 1);
    expect(ids(input)).toEqual(['a', 'b']);
  });
});

describe('routineTargetOf', () => {
  it('is the exercise itself for a routine item', () => {
    expect(routineTargetOf(item('bench'))).toBe('bench');
  });

  it('is the replaced routine exercise for a replacement', () => {
    expect(
      routineTargetOf(item('incline', { origin: 'replacement', replacesExerciseId: 'bench' })),
    ).toBe('bench');
  });

  it('is null for an exercise added today', () => {
    expect(routineTargetOf(item('fly', { origin: 'added' }))).toBeNull();
  });
});

describe('applyReplacement', () => {
  const newRows = [row('n1'), row('n2')];

  it('with nothing checked: the new exercise takes the place, the old one is gone', () => {
    const items = [item('x'), item('bench', { rows: [row('r1'), row('r2')] }), item('y')];
    const result = applyReplacement(items, 'bench', 'incline', newRows);
    expect(ids(result)).toEqual(['x', 'incline', 'y']);
    expect(result[1]).toMatchObject({
      origin: 'replacement',
      replacesExerciseId: 'bench',
      skipped: false,
    });
    expect(result[1]?.rows).toBe(newRows);
  });

  it('with checked sets: the old exercise keeps only those rows and the new one follows it', () => {
    const items = [
      item('bench', { rows: [row('r1', true), row('r2', true), row('r3'), row('r4')] }),
      item('y'),
    ];
    const result = applyReplacement(items, 'bench', 'incline', newRows);
    expect(ids(result)).toEqual(['bench', 'incline', 'y']);
    expect(result[0]?.rows.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(result[0]?.origin).toBe('routine');
    expect(result[1]).toMatchObject({ origin: 'replacement', replacesExerciseId: 'bench' });
  });

  it('a chain keeps pointing at the original routine exercise', () => {
    const items = [
      item('incline', { origin: 'replacement', replacesExerciseId: 'bench', rows: [row('r')] }),
    ];
    const result = applyReplacement(items, 'incline', 'fly', []);
    expect(result[0]).toMatchObject({ exerciseId: 'fly', replacesExerciseId: 'bench' });
  });

  it('replacing an exercise added today leaves no routine target', () => {
    const items = [item('fly', { origin: 'added' })];
    expect(applyReplacement(items, 'fly', 'curl', [])[0]).toMatchObject({
      origin: 'replacement',
      replacesExerciseId: null,
    });
  });

  it('throws when the old exercise is not in the session, and keeps the input intact', () => {
    const items = [item('a')];
    expect(() => applyReplacement(items, 'nope', 'b', [])).toThrow(/not in this session/);
    expect(ids(items)).toEqual(['a']);
  });
});

describe('hasCheckedRows', () => {
  it('is true only when some row is checked', () => {
    expect(hasCheckedRows(item('a', { rows: [row('1'), row('2', true)] }))).toBe(true);
    expect(hasCheckedRows(item('a', { rows: [row('1')] }))).toBe(false);
    expect(hasCheckedRows(item('a'))).toBe(false);
  });
});
