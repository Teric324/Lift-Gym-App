import { describe, expect, it } from 'vitest';
import { formatWeight, parseWeight, stepList } from './weight';

const grams = (input: string) => {
  const result = parseWeight(input);
  if (!result.ok) throw new Error(`expected "${input}" to parse, got ${result.error}`);
  return result.grams;
};

describe('parseWeight: accepted input', () => {
  it.each([
    ['27.25', 27250],
    ['27,25', 27250],
    [' 27.25 ', 27250],
    ['27.25 kg', 27250],
    ['27.25kg', 27250],
    ['27.25 KG', 27250],
    ['.5', 500],
    [',5', 500],
    ['0', 0],
    ['60', 60000],
    ['0.1', 100],
    ['2.05', 2050],
  ])('%j -> %i g', (input, expected) => {
    expect(grams(input)).toBe(expected);
  });

  it('stores an exact integer number of grams', () => {
    const g = grams('27.25');
    expect(Number.isInteger(g)).toBe(true);
    expect(g).toBe(27250);
  });

  it('has no float drift for values such as 1.1 and 4.35', () => {
    expect(grams('1.1')).toBe(1100);
    expect(grams('4.35')).toBe(4350);
    expect(grams('0.29')).toBe(290);
  });
});

describe('parseWeight: rejected input', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'invalid'],
    ['kg', 'invalid'],
    ['.', 'invalid'],
    ['27.', 'invalid'],
    ['1e3', 'invalid'],
    ['27.25.5', 'invalid'],
    ['27,25,5', 'invalid'],
    ['27 25', 'invalid'],
    ['-5', 'negative'],
    ['-0.5', 'negative'],
  ])('%j -> %s', (input, error) => {
    expect(parseWeight(input)).toEqual({ ok: false, error });
  });

  it('rejects more than 2 decimals instead of rounding silently', () => {
    expect(parseWeight('27.256')).toEqual({ ok: false, error: 'too-many-decimals' });
    expect(parseWeight('27,251')).toEqual({ ok: false, error: 'too-many-decimals' });
    expect(parseWeight('0.001')).toEqual({ ok: false, error: 'too-many-decimals' });
  });

  it('rejects absurd values', () => {
    expect(parseWeight('10001')).toEqual({ ok: false, error: 'too-large' });
    expect(parseWeight('99999999999999999999')).toEqual({ ok: false, error: 'too-large' });
  });
});

describe('parseWeight: confirm flag above 500 kg', () => {
  it('does not ask at or below 500 kg', () => {
    expect(parseWeight('500')).toEqual({ ok: true, grams: 500000, needsConfirm: false });
    expect(parseWeight('100')).toEqual({ ok: true, grams: 100000, needsConfirm: false });
    expect(parseWeight('0')).toEqual({ ok: true, grams: 0, needsConfirm: false });
  });

  it('accepts but flags values above 500 kg', () => {
    expect(parseWeight('500.25')).toEqual({ ok: true, grams: 500250, needsConfirm: true });
    expect(parseWeight('501')).toEqual({ ok: true, grams: 501000, needsConfirm: true });
    expect(parseWeight('10000')).toEqual({ ok: true, grams: 10_000_000, needsConfirm: true });
  });
});

describe('stepList', () => {
  it('step 0.25 gives exact multiples, no float noise', () => {
    const list = stepList(250, 8);
    expect(list).toEqual([250, 500, 750, 1000, 1250, 1500, 1750, 2000]);
    expect(list.map(formatWeight)).toEqual([
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

  it('step 2.5 and step 1', () => {
    expect(stepList(2500, 4).map(formatWeight)).toEqual(['2.5', '5', '7.5', '10']);
    expect(stepList(1000, 4).map(formatWeight)).toEqual(['1', '2', '3', '4']);
  });

  it('only produces integers, even far into the list', () => {
    for (const step of [250, 500, 1000, 2000, 2500, 4000, 5000, 1250]) {
      expect(stepList(step, 400).every(Number.isInteger)).toBe(true);
    }
    expect(stepList(250, 400)[399]).toBe(100000);
  });

  it('handles a count of 0 and rejects invalid steps', () => {
    expect(stepList(250, 0)).toEqual([]);
    expect(() => stepList(0, 3)).toThrow(RangeError);
    expect(() => stepList(-250, 3)).toThrow(RangeError);
    expect(() => stepList(0.25, 3)).toThrow(RangeError);
  });
});

describe('formatWeight', () => {
  it.each([
    [27250, '27.25'],
    [60000, '60'],
    [500, '0.5'],
    [0, '0'],
    [100, '0.1'],
    [1050, '1.05'],
    [2500, '2.5'],
    [500000, '500'],
  ])('%i g -> %s', (input, expected) => {
    expect(formatWeight(input)).toBe(expected);
  });

  it('round-trips with parseWeight', () => {
    for (const g of [0, 10, 250, 500, 27250, 60000, 123450]) {
      expect(grams(formatWeight(g))).toBe(g);
    }
  });
});
