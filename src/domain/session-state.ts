import type { Session, SessionSet } from './types';

/** An active session that started on an earlier local day than `today` ("YYYY-MM-DD"). */
export function isStaleSession(session: Session, today: string): boolean {
  return session.finishedAt === null && session.date < today;
}

/**
 * When a forgotten session should be recorded as having ended: at its last checked set, or at
 * its start if it has none. Using "now" would make a session from days ago look like today's and
 * disturb which session counts as the latest one for pre-filling.
 */
export function endTimeForSession(session: Session, sets: readonly SessionSet[]): number {
  return sets
    .filter((s) => s.sessionId === session.id)
    .reduce((latest, s) => Math.max(latest, s.createdAt), session.startedAt);
}
