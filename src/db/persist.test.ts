import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPersistRecord, requestPersistentStorage } from './persist';
import { LiftDB } from './schema';

let db: LiftDB;
let n = 0;

beforeEach(() => {
  db = new LiftDB(`lift-persist-test-${++n}`);
});

afterEach(async () => {
  await db.delete();
});

describe('requestPersistentStorage', () => {
  it('stores "granted" when the browser grants persistence', async () => {
    const storage = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    };
    expect(await requestPersistentStorage(db, storage, 123)).toBe('granted');
    expect(await getPersistRecord(db)).toEqual({ status: 'granted', checkedAt: 123 });
    expect(storage.persist).toHaveBeenCalledOnce();
  });

  it('stores "denied" when the browser refuses', async () => {
    const storage = { persisted: async () => false, persist: async () => false };
    expect(await requestPersistentStorage(db, storage, 5)).toBe('denied');
    expect((await getPersistRecord(db))?.status).toBe('denied');
  });

  it('does not ask again when storage is already persistent', async () => {
    const persist = vi.fn();
    const status = await requestPersistentStorage(db, { persisted: async () => true, persist });
    expect(status).toBe('granted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('reports "unsupported" without the API', async () => {
    expect(await requestPersistentStorage(db, undefined)).toBe('unsupported');
    expect(await requestPersistentStorage(db, {})).toBe('unsupported');
    expect((await getPersistRecord(db))?.status).toBe('unsupported');
  });

  it('never throws if the browser API throws', async () => {
    const storage = {
      persisted: async () => false,
      persist: async () => Promise.reject(new Error('boom')),
    };
    expect(await requestPersistentStorage(db, storage)).toBe('denied');
  });

  it('has no record before the first call', async () => {
    expect(await getPersistRecord(db)).toBeNull();
  });
});
