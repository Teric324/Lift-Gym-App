import type { LiftDB } from './schema';

const PERSIST_KEY = 'storagePersist';

/**
 * granted: the browser promised not to evict our data under storage pressure.
 * denied: it did not promise; the data can be cleared (iOS does this to unused sites).
 * unsupported: the API does not exist here.
 */
export type PersistStatus = 'granted' | 'denied' | 'unsupported';

export interface PersistRecord {
  status: PersistStatus;
  checkedAt: number;
}

type StorageLike = Partial<Pick<StorageManager, 'persist' | 'persisted'>>;

/**
 * Asks the browser for persistent storage and keeps the answer for the Settings screen. Safe to
 * call on every start: an existing grant is not asked for again, and errors never throw.
 */
export async function requestPersistentStorage(
  db: LiftDB,
  storage: StorageLike | undefined = globalThis.navigator?.storage,
  now: number = Date.now(),
): Promise<PersistStatus> {
  let status: PersistStatus = 'unsupported';
  if (storage && typeof storage.persist === 'function') {
    try {
      const already = typeof storage.persisted === 'function' ? await storage.persisted() : false;
      status = already || (await storage.persist()) ? 'granted' : 'denied';
    } catch {
      status = 'denied';
    }
  }
  await db.meta.put({
    key: PERSIST_KEY,
    value: { status, checkedAt: now } satisfies PersistRecord,
  });
  return status;
}

export async function getPersistRecord(db: LiftDB): Promise<PersistRecord | null> {
  const entry = await db.meta.get(PERSIST_KEY);
  const value = entry?.value as Partial<PersistRecord> | undefined;
  const valid = ['granted', 'denied', 'unsupported'];
  if (value && valid.includes(value.status as string) && typeof value.checkedAt === 'number') {
    return value as PersistRecord;
  }
  return null;
}
