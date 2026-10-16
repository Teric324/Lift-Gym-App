import { describe, expect, it } from 'vitest';
import { decideAppHeight } from './app-height';

const base = {
  standalone: true,
  innerWidth: 393,
  innerHeight: 793,
  screenHeight: 852,
  safeTop: 59,
};

describe('decideAppHeight', () => {
  it('uses the screen height when iOS is short by the top safe area at launch', () => {
    expect(decideAppHeight(base)).toEqual({ height: 852, source: 'screen' });
  });
  it('allows 2px of difference', () => {
    expect(decideAppHeight({ ...base, innerHeight: 792 }).source).toBe('screen');
    expect(decideAppHeight({ ...base, innerHeight: 790 }).source).toBe('innerHeight');
  });
  it('uses innerHeight when the viewport is already right', () => {
    expect(decideAppHeight({ ...base, innerHeight: 852 })).toEqual({
      height: 852,
      source: 'innerHeight',
    });
  });
  it('uses innerHeight outside the Home Screen app', () => {
    expect(decideAppHeight({ ...base, standalone: false }).source).toBe('innerHeight');
  });
  it('uses innerHeight in landscape', () => {
    expect(
      decideAppHeight({
        ...base,
        innerWidth: 793,
        innerHeight: 393,
        screenHeight: 852,
        safeTop: 0,
      }),
    ).toEqual({ height: 393, source: 'innerHeight' });
  });
  it('does not mistake a keyboard-sized or unrelated difference for the safe area', () => {
    expect(decideAppHeight({ ...base, innerHeight: 500 }).source).toBe('innerHeight');
  });
  it('uses innerHeight when there is no safe area', () => {
    expect(decideAppHeight({ ...base, safeTop: 0 }).source).toBe('innerHeight');
  });
});
