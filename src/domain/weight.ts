// Weights are kg in the UI and integer grams everywhere else. All conversions work on the
// decimal string or on integers, never on floating-point kg, so there is no drift.

export const GRAMS_PER_KG = 1000;
/** Above this the UI asks "Are you sure?" but still accepts the value. */
export const CONFIRM_ABOVE_GRAMS = 500 * GRAMS_PER_KG;
/** Hard limit: anything larger is treated as a typo and rejected. */
export const MAX_GRAMS = 10_000 * GRAMS_PER_KG;
export const MAX_DECIMALS = 2;

export type WeightError = 'empty' | 'invalid' | 'negative' | 'too-many-decimals' | 'too-large';

export type ParseWeightResult =
  { ok: true; grams: number; needsConfirm: boolean } | { ok: false; error: WeightError };

// digits with an optional `.`/`,` fraction ("27." and ".5" are fine, a lone "." is not), optional "kg".
const WEIGHT_PATTERN = /^(\d*)(?:[.,](\d*))?\s*(?:kg)?$/i;

export function parseWeight(input: string): ParseWeightResult {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'empty' };
  if (text.startsWith('-')) return { ok: false, error: 'negative' };

  const match = WEIGHT_PATTERN.exec(text);
  const whole = match?.[1] ?? '';
  const fraction = match?.[2] ?? '';
  if (!match || (whole === '' && fraction === '')) return { ok: false, error: 'invalid' };
  if (fraction.length > MAX_DECIMALS) return { ok: false, error: 'too-many-decimals' };

  const grams = Number(whole || '0') * GRAMS_PER_KG + Number(fraction.padEnd(3, '0'));
  if (!Number.isSafeInteger(grams) || grams > MAX_GRAMS) return { ok: false, error: 'too-large' };

  return { ok: true, grams, needsConfirm: grams > CONFIRM_ABOVE_GRAMS };
}

/** 27250 -> "27.25", 60000 -> "60", 500 -> "0.5". Display only; the value stays in grams. */
export function formatWeight(grams: number): string {
  const whole = Math.floor(grams / GRAMS_PER_KG);
  const fraction = String(grams % GRAMS_PER_KG)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

/** step, 2*step, 3*step, ... up to `count` entries, built by integer multiplication. */
export function stepList(stepGrams: number, count: number): number[] {
  if (!Number.isInteger(stepGrams) || stepGrams <= 0) {
    throw new RangeError('stepGrams must be a positive integer');
  }
  return Array.from({ length: Math.max(0, count) }, (_, i) => stepGrams * (i + 1));
}

/** Step given to a new exercise: 2.5 kg. */
export const DEFAULT_STEP_GRAMS = 2500;
