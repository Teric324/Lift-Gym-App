import { describe, expect, it } from 'vitest';
import { MAX_STEP_GRAMS, parseStep, STEP_PRESETS_GRAMS } from './step';

describe('parseStep', () => {
  it.each([
    ['2.5', 2500],
    ['2,5', 2500],
    [' 1.25 kg ', 1250],
    ['0.25', 250],
    ['0.01', 10],
    ['100', 100000],
  ])('%j -> %i g', (input, grams) => {
    expect(parseStep(input)).toEqual({ ok: true, grams });
  });

  it.each([
    ['', 'empty'],
    ['abc', 'invalid'],
    ['-2', 'negative'],
    ['0', 'zero'],
    ['0.00', 'zero'],
    ['0.001', 'too-many-decimals'],
    ['100.01', 'too-big'],
    ['500', 'too-big'],
  ])('%j is rejected as %s', (input, error) => {
    expect(parseStep(input)).toEqual({ ok: false, error });
  });

  it('the presets are 0.25, 0.5, 1, 2, 2.5, 4 and 5 kg, all valid', () => {
    expect(STEP_PRESETS_GRAMS).toEqual([250, 500, 1000, 2000, 2500, 4000, 5000]);
    for (const grams of STEP_PRESETS_GRAMS) {
      expect(grams).toBeLessThanOrEqual(MAX_STEP_GRAMS);
      expect(Number.isInteger(grams)).toBe(true);
    }
  });
});
