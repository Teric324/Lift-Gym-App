import { parseWeight, type WeightError } from './weight';

/** Steps offered as one-tap choices, in grams: 0.25, 0.5, 1, 2, 2.5, 4 and 5 kg. */
export const STEP_PRESETS_GRAMS: readonly number[] = [250, 500, 1000, 2000, 2500, 4000, 5000];

export const MIN_STEP_GRAMS = 10; // 0.01 kg
export const MAX_STEP_GRAMS = 100_000; // 100 kg

export type StepError = WeightError | 'zero' | 'too-small' | 'too-big';

export type ParseStepResult = { ok: true; grams: number } | { ok: false; error: StepError };

/** A custom weight step typed by the user. Same input rules as a weight (`.`/`,`, "kg"). */
export function parseStep(input: string): ParseStepResult {
  const weight = parseWeight(input);
  if (!weight.ok) return { ok: false, error: weight.error };
  if (weight.grams === 0) return { ok: false, error: 'zero' };
  if (weight.grams < MIN_STEP_GRAMS) return { ok: false, error: 'too-small' };
  if (weight.grams > MAX_STEP_GRAMS) return { ok: false, error: 'too-big' };
  return { ok: true, grams: weight.grams };
}
