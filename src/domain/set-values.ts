import { MAX_GRAMS } from './weight';

export const MIN_REPS = 1;
export const MAX_REPS = 100;

/** Guard for values that are about to be stored. Weight 0 is valid (bodyweight). */
export function assertValidSetValues(weightGrams: number, reps: number): void {
  if (!Number.isInteger(weightGrams) || weightGrams < 0 || weightGrams > MAX_GRAMS) {
    throw new RangeError(`Invalid weight: ${weightGrams} g`);
  }
  if (!Number.isInteger(reps) || reps < MIN_REPS || reps > MAX_REPS) {
    throw new RangeError(`Invalid reps: ${reps}`);
  }
}

/** For a row that may still be blank: each value is checked only if it is filled in. */
export function assertValidPartialSetValues(weightGrams: number | null, reps: number | null): void {
  if (weightGrams !== null) assertValidSetValues(weightGrams, MIN_REPS);
  if (reps !== null) assertValidSetValues(0, reps);
}
