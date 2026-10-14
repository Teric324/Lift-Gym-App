import { CONFIRM_ABOVE_GRAMS } from './weight';

/** The list stops here; heavier weights are typed. Same limit as the "Are you sure?" warning. */
export const PICKER_MAX_GRAMS = CONFIRM_ABOVE_GRAMS;

/** How many steps are shown on each side of the centre. */
export const PICKER_SPAN_STEPS = 30;

/** Jump buttons, in grams: they move the visible part of the list, they do not set a weight. */
export const PICKER_JUMPS_GRAMS: readonly number[] = [-25_000, -10_000, 10_000, 25_000];

/** The largest multiple of `stepGrams` the list reaches. */
function lastMultiple(stepGrams: number): number {
  return Math.floor(PICKER_MAX_GRAMS / stepGrams);
}

function assertStep(stepGrams: number): void {
  if (!Number.isInteger(stepGrams) || stepGrams <= 0) {
    throw new RangeError('stepGrams must be a positive integer');
  }
}

/**
 * The multiple of the step closest to `grams`, kept inside the list (from one step up to the
 * plafond). Halves round up. Integer maths only.
 */
export function nearestStep(grams: number, stepGrams: number): number {
  assertStep(stepGrams);
  const nearest = Math.floor((2 * Math.max(0, grams) + stepGrams) / (2 * stepGrams));
  const index = Math.min(lastMultiple(stepGrams), Math.max(1, nearest));
  return index * stepGrams;
}

/**
 * Where the list is centred when the picker opens: the weight already in the row, else the one
 * used last time, else the first step.
 */
export function pickerStart(
  valueGrams: number | null,
  lastGrams: number | null,
  stepGrams: number,
): number {
  return nearestStep(valueGrams ?? lastGrams ?? stepGrams, stepGrams);
}

/** The values to show around `centerGrams`: `span` steps each side, inside the list. */
export function pickerWindow(
  stepGrams: number,
  centerGrams: number,
  span: number = PICKER_SPAN_STEPS,
): number[] {
  const center = nearestStep(centerGrams, stepGrams) / stepGrams;
  const from = Math.max(1, center - span);
  const to = Math.min(lastMultiple(stepGrams), center + span);
  const values: number[] = [];
  for (let index = from; index <= to; index++) values.push(index * stepGrams);
  return values;
}

/** The new centre after pressing a jump button; stops at the ends of the list. */
export function jumpCenter(centerGrams: number, deltaGrams: number, stepGrams: number): number {
  return nearestStep(centerGrams + deltaGrams, stepGrams);
}
