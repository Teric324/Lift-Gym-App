import { localDateString } from '../../domain/date';
import { newId } from '../../domain/id';
import type { Session, SessionDraft } from '../../domain/types';
import type { LiftDB } from '../schema';
import { buildPlanRows } from './drafts';

export class ActiveSessionExistsError extends Error {
  constructor(public readonly activeSession: Session) {
    super('There is already an active session');
    this.name = 'ActiveSessionExistsError';
  }
}

export async function getActiveSession(db: LiftDB): Promise<Session | undefined> {
  return db.sessions.filter((s) => s.finishedAt === null).first();
}

export function getSession(db: LiftDB, id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

/** Newest first: by date, then by start time. */
export async function listSessions(db: LiftDB): Promise<Session[]> {
  const all = await db.sessions.toArray();
  return all.sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.startedAt - a.startedAt,
  );
}

/**
 * Starts a session of a routine and creates its draft (the routine's exercises, in order).
 * Only one session can be active: if one exists this throws `ActiveSessionExistsError` so the
 * UI can ask whether to finish it first.
 */
export async function startSession(
  db: LiftDB,
  workoutId: string,
  now: number = Date.now(),
): Promise<{ session: Session; draft: SessionDraft }> {
  return db.transaction(
    'rw',
    db.sessions,
    db.drafts,
    db.workouts,
    db.sets,
    db.exercises,
    async () => {
      const active = await getActiveSession(db);
      if (active) throw new ActiveSessionExistsError(active);

      const workout = await db.workouts.get(workoutId);
      if (!workout) throw new Error(`Workout ${workoutId} not found`);
      // Archived exercises stay in the routine but are left out of new sessions.
      const exercises = await db.exercises.bulkGet(workout.exerciseIds);
      const exerciseIds = workout.exerciseIds.filter((_, i) => exercises[i]?.archived === false);
      const planRows = await buildPlanRows(db, exerciseIds);

      const session: Session = {
        id: newId(),
        workoutId,
        date: localDateString(now),
        startedAt: now,
        finishedAt: null,
      };
      const draft: SessionDraft = {
        sessionId: session.id,
        items: exerciseIds.map((exerciseId) => ({
          exerciseId,
          origin: 'routine',
          replacesExerciseId: null,
          skipped: false,
          rows: planRows.get(exerciseId) ?? [],
        })),
        updatedAt: now,
      };
      await db.sessions.add(session);
      await db.drafts.add(draft);
      return { session, draft };
    },
  );
}

/** Ends the session and drops its draft. Checked sets stay. */
export async function finishSession(
  db: LiftDB,
  sessionId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.sessions, db.drafts, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.finishedAt === null) await db.sessions.update(sessionId, { finishedAt: now });
    await db.drafts.delete(sessionId);
  });
}

/** Deletes a session with its sets and draft. PRs recalculate because they are never stored. */
export async function deleteSession(db: LiftDB, sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, db.drafts, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.drafts.delete(sessionId);
    await db.sessions.delete(sessionId);
  });
}
