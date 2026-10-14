import type { Session, SessionSet } from './types';

/** An unchecked suggestion: shown pre-filled, saved only when the user checks it. */
export interface PrefillSet {
  weightGrams: number;
  reps: number;
}

/**
 * For each exercise, the sets from the last finished session in which that exercise had sets,
 * in their original order. "Last" is by session date, then by finish time. Active (unfinished)
 * sessions are ignored, and so is the routine: only the exercise's own history counts.
 * An exercise with no history gets an empty list.
 */
export function prefillForExercises(
  exerciseIds: readonly string[],
  sessions: readonly Session[],
  sets: readonly SessionSet[],
): Map<string, PrefillSet[]> {
  const finished = new Map<string, Session>();
  for (const session of sessions) {
    if (session.finishedAt !== null) finished.set(session.id, session);
  }

  const result = new Map<string, PrefillSet[]>();
  for (const exerciseId of exerciseIds) {
    // Group this exercise's sets by finished session.
    const bySession = new Map<string, SessionSet[]>();
    for (const set of sets) {
      if (set.exerciseId !== exerciseId || !finished.has(set.sessionId)) continue;
      const group = bySession.get(set.sessionId);
      if (group) group.push(set);
      else bySession.set(set.sessionId, [set]);
    }

    let last: Session | null = null;
    for (const sessionId of bySession.keys()) {
      const session = finished.get(sessionId)!;
      if (last === null || compareSessions(session, last) > 0) last = session;
    }

    const lastSets = last ? bySession.get(last.id)! : [];
    result.set(
      exerciseId,
      [...lastSets]
        .sort((a, b) => a.order - b.order)
        .map(({ weightGrams, reps }) => ({ weightGrams, reps })),
    );
  }
  return result;
}

/** Positive if `a` is more recent than `b`: by date, then finish time, then start time. */
function compareSessions(a: Session, b: Session): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.finishedAt ?? 0) - (b.finishedAt ?? 0) || a.startedAt - b.startedAt;
}
