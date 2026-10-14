import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/instance';
import { localDateString } from '../../domain/date';
import { getDraft } from '../../db/repo/drafts';
import { getActiveSession } from '../../db/repo/sessions';
import { getWorkout } from '../../db/repo/workouts';
import type { Exercise, Session, SessionDraft, Workout } from '../../domain/types';

export interface SessionView {
  session: Session;
  workout: Workout | null;
  draft: SessionDraft;
  exercises: Map<string, Exercise>;
  /** Today's local date when the view was read ("YYYY-MM-DD"). */
  today: string;
}

/**
 * Everything the session screen shows, read from the database and kept live. `undefined` while
 * loading, `null` when there is no active session.
 */
export function useSessionView(): SessionView | null | undefined {
  return useLiveQuery(async (): Promise<SessionView | null> => {
    const session = await getActiveSession(db);
    if (!session) return null;
    const draft = await getDraft(db, session.id);
    if (!draft) return null;
    const exercises = await db.exercises.bulkGet(draft.items.map((i) => i.exerciseId));
    return {
      session,
      workout: (await getWorkout(db, session.workoutId)) ?? null,
      draft,
      today: localDateString(Date.now()),
      exercises: new Map(
        exercises.filter((e): e is Exercise => e !== undefined).map((e) => [e.id, e]),
      ),
    };
  }, []);
}
