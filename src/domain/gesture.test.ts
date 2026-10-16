import { describe, expect, it } from 'vitest';
import { settleOpen, swipeAxis, swipeOffset } from './gesture';

describe('swipeAxis', () => {
  it('waits until the finger has moved 10 px', () => {
    expect(swipeAxis(0, 0)).toBeNull();
    expect(swipeAxis(-9, 4)).toBeNull();
  });

  it('goes with the bigger movement', () => {
    expect(swipeAxis(-14, 3)).toBe('horizontal');
    expect(swipeAxis(6, 12)).toBe('vertical');
    expect(swipeAxis(-12, -30)).toBe('vertical');
  });
});

describe('swipeOffset', () => {
  it('follows the finger from closed, only to the left, up to the reveal width', () => {
    expect(swipeOffset(false, -30)).toBe(-30);
    expect(swipeOffset(false, 25)).toBe(0);
    expect(swipeOffset(false, -300)).toBe(-80);
  });

  it('starts from the open position when the row was open', () => {
    expect(swipeOffset(true, 0)).toBe(-80);
    expect(swipeOffset(true, 30)).toBe(-50);
    expect(swipeOffset(true, 200)).toBe(0);
    expect(swipeOffset(true, -40)).toBe(-80);
  });
});

describe('settleOpen', () => {
  it('a closed row opens at 60 px and stays closed before that', () => {
    expect(settleOpen(false, -59)).toBe(false);
    expect(settleOpen(false, -60)).toBe(true);
  });

  it('an open row closes when pushed back 30 px or more', () => {
    expect(settleOpen(true, -80)).toBe(true);
    expect(settleOpen(true, -51)).toBe(true);
    expect(settleOpen(true, -49)).toBe(false);
  });
});
