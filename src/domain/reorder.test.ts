import { describe, expect, it } from 'vitest';
import { dropIndex, shiftFor } from './reorder';

describe('dropIndex', () => {
  const centers = [50, 150, 250, 350];

  it('stays in place until the dragged row passes a neighbour centre', () => {
    expect(dropIndex(centers, 1, 150)).toBe(1);
    expect(dropIndex(centers, 1, 240)).toBe(1);
    expect(dropIndex(centers, 1, 60)).toBe(1);
  });

  it('moves down past the centres it has crossed', () => {
    expect(dropIndex(centers, 0, 260)).toBe(2);
    expect(dropIndex(centers, 0, 400)).toBe(3);
  });

  it('moves up past the centres it has crossed', () => {
    expect(dropIndex(centers, 3, 140)).toBe(1);
    expect(dropIndex(centers, 3, -500)).toBe(0);
  });
});

describe('shiftFor', () => {
  it('shifts the rows between the old and new place out of the way', () => {
    // Dragging row 0 down to slot 2: rows 1 and 2 move up one slot.
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 0, 2))).toEqual([0, -1, -1, 0]);
    // Dragging row 3 up to slot 1: rows 1 and 2 move down one slot.
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 3, 1))).toEqual([0, 1, 1, 0]);
  });

  it('shifts nothing when the row is back where it was', () => {
    expect([0, 1, 2].map((i) => shiftFor(i, 1, 1))).toEqual([0, 0, 0]);
  });
});
