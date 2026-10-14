import { describe, expect, it } from 'vitest';
import {
  jumpCenter,
  nearestStep,
  PICKER_JUMPS_GRAMS,
  PICKER_MAX_GRAMS,
  pickerStart,
  pickerWindow,
} from './weight-picker';
import { formatWeight } from './weight';

describe('nearestStep', () => {
  it('returns the multiple of the step closest to the weight', () => {
    expect(nearestStep(80_000, 2500)).toBe(80_000);
    expect(nearestStep(81_000, 2500)).toBe(80_000);
    expect(nearestStep(81_300, 2500)).toBe(82_500);
    expect(nearestStep(27_250, 250)).toBe(27_250);
    expect(nearestStep(27_300, 250)).toBe(27_250);
  });

  it('rounds exact halves up', () => {
    expect(nearestStep(1250, 2500)).toBe(2500);
    expect(nearestStep(3750, 2500)).toBe(5000);
  });

  it('a weight that is not a multiple lands on a neighbouring multiple (27.25 with step 2.5)', () => {
    expect(nearestStep(27_250, 2500)).toBe(27_500);
  });

  it('never goes below the first step: 0 and tiny weights give one step', () => {
    expect(nearestStep(0, 2500)).toBe(2500);
    expect(nearestStep(100, 2500)).toBe(2500);
    expect(nearestStep(0, 250)).toBe(250);
  });

  it('never goes above the last multiple under the 500 kg limit', () => {
    expect(nearestStep(900_000, 2500)).toBe(500_000);
    expect(nearestStep(900_000, 4000)).toBe(500_000); // 125 * 4 kg
    expect(nearestStep(900_000, 3000)).toBe(498_000); // 166 * 3 kg, the last multiple <= 500 kg
  });

  it('always returns a whole multiple of the step', () => {
    for (const step of [250, 500, 1000, 1250, 2000, 2500, 4000, 5000, 10, 100_000]) {
      for (const grams of [0, 1, 7, 999, 27_250, 123_456, 499_999, 2_000_000]) {
        const result = nearestStep(grams, step);
        expect(result % step).toBe(0);
        expect(result).toBeGreaterThanOrEqual(step);
        expect(result).toBeLessThanOrEqual(Math.max(step, PICKER_MAX_GRAMS));
      }
    }
  });

  it('rejects an invalid step', () => {
    expect(() => nearestStep(1000, 0)).toThrow(RangeError);
    expect(() => nearestStep(1000, -250)).toThrow(RangeError);
    expect(() => nearestStep(1000, 0.25)).toThrow(RangeError);
  });
});

describe('pickerStart', () => {
  it('uses the weight in the row, else last time, else the first step', () => {
    expect(pickerStart(82_500, 80_000, 2500)).toBe(82_500);
    expect(pickerStart(null, 80_000, 2500)).toBe(80_000);
    expect(pickerStart(null, null, 2500)).toBe(2500);
    expect(pickerStart(0, 80_000, 2500)).toBe(2500); // 0 kg is a value of its own: one step
  });
});

describe('pickerWindow', () => {
  it('is centred on the value, step 2.5 kg', () => {
    const values = pickerWindow(2500, 82_500, 3);
    expect(values.map(formatWeight)).toEqual(['75', '77.5', '80', '82.5', '85', '87.5', '90']);
  });

  it('step 0.25 gives exact multiples, with no float noise', () => {
    const values = pickerWindow(250, 1000, 4);
    expect(values).toEqual([250, 500, 750, 1000, 1250, 1500, 1750, 2000]);
    expect(values.map(formatWeight)).toEqual([
      '0.25',
      '0.5',
      '0.75',
      '1',
      '1.25',
      '1.5',
      '1.75',
      '2',
    ]);
  });

  it('step 1.25 and step 1', () => {
    expect(pickerWindow(1250, 5000, 2).map(formatWeight)).toEqual([
      '2.5',
      '3.75',
      '5',
      '6.25',
      '7.5',
    ]);
    expect(pickerWindow(1000, 10_000, 2).map(formatWeight)).toEqual(['8', '9', '10', '11', '12']);
  });

  it('is cut at the first step (no zero, no negatives)', () => {
    const values = pickerWindow(2500, 2500, 3);
    expect(values.map(formatWeight)).toEqual(['2.5', '5', '7.5', '10']);
  });

  it('is cut at the 500 kg limit', () => {
    const values = pickerWindow(2500, 497_500, 3);
    expect(values.at(-1)).toBe(500_000);
    expect(values.every((v) => v <= PICKER_MAX_GRAMS)).toBe(true);
  });

  it('has at most 2 x span + 1 entries and only whole multiples, in ascending order', () => {
    for (const step of [250, 1250, 2500, 4000]) {
      const values = pickerWindow(step, 100_000);
      expect(values.length).toBeLessThanOrEqual(61);
      expect(values.every((v) => v % step === 0)).toBe(true);
      expect([...values].sort((a, b) => a - b)).toEqual(values);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('contains the centre when it is a multiple', () => {
    expect(pickerWindow(2500, 100_000)).toContain(100_000);
  });
});

describe('jumpCenter', () => {
  it('moves the centre by 10 and 25 kg and keeps it on a multiple of the step', () => {
    expect(jumpCenter(60_000, 10_000, 2500)).toBe(70_000);
    expect(jumpCenter(60_000, 25_000, 2500)).toBe(85_000);
    expect(jumpCenter(60_000, -25_000, 2500)).toBe(35_000);
    // a step that does not divide 10 kg: lands on the nearest multiple
    expect(jumpCenter(60_000, 10_000, 4000)).toBe(72_000); // 70 kg is not a multiple of 4: 72
  });

  it('reaches 100 kg from 40 kg in two jumps (+25, +25, then -10)', () => {
    let center = 40_000;
    center = jumpCenter(center, 25_000, 2500);
    center = jumpCenter(center, 25_000, 2500);
    center = jumpCenter(center, 10_000, 2500);
    expect(center).toBe(100_000);
  });

  it('stops at both ends', () => {
    expect(jumpCenter(10_000, -25_000, 2500)).toBe(2500);
    expect(jumpCenter(490_000, 25_000, 2500)).toBe(500_000);
    expect(jumpCenter(500_000, 25_000, 2500)).toBe(500_000);
  });

  it('the jump buttons are -25, -10, +10 and +25 kg', () => {
    expect(PICKER_JUMPS_GRAMS).toEqual([-25_000, -10_000, 10_000, 25_000]);
  });
});
