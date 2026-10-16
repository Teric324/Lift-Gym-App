/** Pure helpers for the swipe-to-delete gesture on a set row. */

/** Movement (px) before the direction of a touch is decided. */
export const AXIS_LOCK_PX = 10;
/** How far the row slides to show the Delete button (px). */
export const REVEAL_PX = 80;
/** A closed row opens when swiped at least this far (px). */
export const OPEN_AT_PX = 60;
/** An open row closes when pushed back at least this far (px). */
export const CLOSE_AT_PX = 30;

/** Which way a touch is going once it has moved far enough to tell, else null. */
export function swipeAxis(
  dx: number,
  dy: number,
  threshold: number = AXIS_LOCK_PX,
): 'horizontal' | 'vertical' | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
}

/** The row's horizontal offset while dragging: 0 (closed) to -reveal (open), never beyond. */
export function swipeOffset(wasOpen: boolean, dx: number, reveal: number = REVEAL_PX): number {
  const start = wasOpen ? -reveal : 0;
  return Math.min(0, Math.max(-reveal, start + dx));
}

/** Whether the row ends up open when the finger is lifted at `offset`. */
export function settleOpen(wasOpen: boolean, offset: number, reveal: number = REVEAL_PX): boolean {
  return wasOpen ? offset <= -(reveal - CLOSE_AT_PX) : offset <= -OPEN_AT_PX;
}
