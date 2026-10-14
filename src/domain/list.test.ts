import { describe, expect, it } from 'vitest';
import { moveItem } from './list';

describe('moveItem', () => {
  const abc = ['a', 'b', 'c', 'd'];

  it('moves down and up by one', () => {
    expect(moveItem(abc, 0, 1)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveItem(abc, 2, 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves to the ends', () => {
    expect(moveItem(abc, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveItem(abc, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('does not change the input and ignores impossible moves', () => {
    const input = ['a', 'b'];
    expect(moveItem(input, 0, 0)).toEqual(['a', 'b']);
    expect(moveItem(input, -1, 1)).toEqual(['a', 'b']);
    expect(moveItem(input, 0, 2)).toEqual(['a', 'b']);
    expect(moveItem(input, 5, 0)).toEqual(['a', 'b']);
    moveItem(input, 0, 1);
    expect(input).toEqual(['a', 'b']);
  });
});
