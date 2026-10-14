import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { db } from '../../db/instance';
import { getActiveSession } from '../../db/repo/sessions';
import type { Session } from '../../domain/types';

/**
 * The active session (or null), kept up to date as the database changes.
 * `undefined` while the first read is in flight.
 */
export function useActiveSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const subscription = liveQuery(() => getActiveSession(db)).subscribe({
      next: (value) => setSession(value ?? null),
      error: () => setSession(null),
    });
    return () => subscription.unsubscribe();
  }, []);
  return session;
}
