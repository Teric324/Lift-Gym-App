/**
 * Pure helpers for drag-to-reorder lists: where a dragged row would land, and how far each other
 * row moves out of its way. Positions are along the drag axis (pixels), any common origin.
 */

/**
 * The index the dragged row would take if dropped now. `centers` are the rows' resting centres in
 * order (the dragged row's included), `from` is the dragged row's index and `draggedCenter` where
 * its centre is now. The row lands after every other row whose centre it has passed.
 */
export function dropIndex(centers: readonly number[], from: number, draggedCenter: number): number {
  let passed = 0;
  centers.forEach((center, index) => {
    if (index !== from && center < draggedCenter) passed += 1;
  });
  return passed;
}

/**
 * How a row that is not being dragged shifts while `from` is dragged over `to`: -1 (one slot up),
 * +1 (one slot down) or 0. Multiply by the dragged row's height for the pixel offset.
 */
export function shiftFor(index: number, from: number, to: number): -1 | 0 | 1 {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -1;
  if (from > to && index >= to && index < from) return 1;
  return 0;
}
