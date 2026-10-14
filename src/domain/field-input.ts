import { MAX_REPS, MIN_REPS } from './set-values';
import { parseWeight, type WeightError } from './weight';

/**
 * What a text field currently holds, for the weight and reps inputs of a set. The UI saves on
 * every "valid" reading, keeps showing an "invalid" one marked, and ignores an "empty" one (so
 * clearing the field to retype does not wipe the stored value).
 */
export type FieldReading<T> =
  | { state: 'empty' }
  | { state: 'invalid'; error: FieldError }
  | { state: 'valid'; value: T; warn: boolean };

export type FieldError = WeightError | 'not-a-whole-number' | 'reps-out-of-range';

export function readWeightText(text: string): FieldReading<number> {
  const result = parseWeight(text);
  if (result.ok) return { state: 'valid', value: result.grams, warn: result.needsConfirm };
  if (result.error === 'empty') return { state: 'empty' };
  return { state: 'invalid', error: result.error };
}

export function readRepsText(text: string): FieldReading<number> {
  const trimmed = text.trim();
  if (trimmed === '') return { state: 'empty' };
  if (!/^\d+$/.test(trimmed)) return { state: 'invalid', error: 'not-a-whole-number' };
  const reps = Number(trimmed);
  if (reps < MIN_REPS || reps > MAX_REPS) return { state: 'invalid', error: 'reps-out-of-range' };
  return { state: 'valid', value: reps, warn: false };
}
