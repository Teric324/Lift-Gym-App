import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('newId', () => {
  it('uses crypto.randomUUID() when it exists', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'fixed-uuid',
      getRandomValues: () => {
        throw new Error('should not be called');
      },
    });
    expect(newId()).toBe('fixed-uuid');
  });

  it('falls back to getRandomValues() when randomUUID is missing (plain http)', () => {
    const getRandomValues = vi.fn(<T extends ArrayBufferView>(array: T): T => {
      new Uint8Array(array.buffer).fill(0xff);
      return array;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    const id = newId();
    expect(getRandomValues).toHaveBeenCalledOnce();
    // 0xff everywhere, with the version nibble forced to 4 and the variant bits to 10.
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(id).toMatch(UUID_V4);
  });

  it('fallback ids are valid v4 UUIDs and do not repeat', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: <T extends ArrayBufferView>(array: T): T => {
        const bytes = new Uint8Array(array.buffer);
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        return array;
      },
    });
    const ids = Array.from({ length: 500 }, () => newId());
    expect(ids.every((id) => UUID_V4.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(500);
  });

  it('works with the real crypto', () => {
    expect(newId()).toMatch(UUID_V4);
    expect(newId()).not.toBe(newId());
  });

  it('throws a clear error when there is no random source', () => {
    vi.stubGlobal('crypto', {});
    expect(() => newId()).toThrow(/random source/);
  });
});
