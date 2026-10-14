import { describe, expect, it } from 'vitest';
import { readRepsText, readWeightText, type FieldReading } from './field-input';

/** The values a field would save while the user types `keystrokes` one character at a time. */
function savedWhileTyping(
  text: string,
  read: (text: string) => FieldReading<number>,
): (number | null)[] {
  const saved: (number | null)[] = [];
  let last: number | null = null;
  for (let i = 1; i <= text.length; i++) {
    const reading = read(text.slice(0, i));
    if (reading.state === 'valid' && reading.value !== last) {
      last = reading.value;
      saved.push(last);
    }
  }
  return saved;
}

describe('readWeightText', () => {
  it('reads valid weights, with . or , and an optional kg', () => {
    expect(readWeightText('27.25')).toEqual({ state: 'valid', value: 27250, warn: false });
    expect(readWeightText('27,25')).toEqual({ state: 'valid', value: 27250, warn: false });
    expect(readWeightText(' 60 kg ')).toEqual({ state: 'valid', value: 60000, warn: false });
    expect(readWeightText('0')).toEqual({ state: 'valid', value: 0, warn: false });
  });

  it('warns above 500 kg but still reads it as valid', () => {
    expect(readWeightText('501')).toEqual({ state: 'valid', value: 501000, warn: true });
    expect(readWeightText('500')).toEqual({ state: 'valid', value: 500000, warn: false });
  });

  it('treats empty and whitespace as empty, not invalid', () => {
    expect(readWeightText('')).toEqual({ state: 'empty' });
    expect(readWeightText('   ')).toEqual({ state: 'empty' });
  });

  it('marks everything else invalid', () => {
    for (const text of ['abc', '-5', '1e3', '27.25.5', '27.256', '10001', '.']) {
      expect(readWeightText(text).state).toBe('invalid');
    }
  });

  it('typing 27.25 saves every new valid value along the way', () => {
    // "27." is valid (27 kg) but unchanged, so it is not saved a second time.
    expect(savedWhileTyping('27.25', readWeightText)).toEqual([2000, 27000, 27200, 27250]);
  });

  it('typing a comma decimal works the same', () => {
    expect(savedWhileTyping('27,5', readWeightText)).toEqual([2000, 27000, 27500]);
  });

  it('a typo in the middle is not saved and the last valid value stays', () => {
    // 1 -> valid, 1x -> invalid (not saved), 1x0 -> invalid
    expect(savedWhileTyping('1x0', readWeightText)).toEqual([1000]);
  });
});

describe('readRepsText', () => {
  it('reads whole numbers from 1 to 100', () => {
    expect(readRepsText('1')).toEqual({ state: 'valid', value: 1, warn: false });
    expect(readRepsText(' 12 ')).toEqual({ state: 'valid', value: 12, warn: false });
    expect(readRepsText('100')).toEqual({ state: 'valid', value: 100, warn: false });
  });

  it('empty is empty; out of range and non-numbers are invalid', () => {
    expect(readRepsText('')).toEqual({ state: 'empty' });
    expect(readRepsText('0')).toEqual({ state: 'invalid', error: 'reps-out-of-range' });
    expect(readRepsText('101')).toEqual({ state: 'invalid', error: 'reps-out-of-range' });
    expect(readRepsText('5.5')).toEqual({ state: 'invalid', error: 'not-a-whole-number' });
    expect(readRepsText('-3')).toEqual({ state: 'invalid', error: 'not-a-whole-number' });
    expect(readRepsText('abc')).toEqual({ state: 'invalid', error: 'not-a-whole-number' });
  });

  it('typing 12 saves 1 then 12; typing 101 stops saving at 10', () => {
    expect(savedWhileTyping('12', readRepsText)).toEqual([1, 12]);
    expect(savedWhileTyping('101', readRepsText)).toEqual([1, 10]);
  });
});
