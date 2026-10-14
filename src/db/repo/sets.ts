import { newId } from '../../domain/id';
import { assertValidSetValues } from '../../domain/set-values';
import type { SessionSet } from '../../domain/types';
import type { LiftDB } from '../schema';

export interface SetValues {
  weightGrams: number;
  reps: number;
}

/** Stores a checked set. Unchecked sets never reach the database. */
export async function addSet(
  db: LiftDB,
  input: SetValues & {
    sessionId: string;
    exerciseId: string;
    /** Position among the exercise's sets; defaults to after the existing ones. */
    order?: number;
  },
  now: number = Date.now(),
): Promise<SessionSet> {
  assertValidSetValues(input.weightGrams, input.reps);
  return db.transaction('rw', db.sets, db.sessions, db.exercises, async () => {
    if (!(await db.sessions.get(input.sessionId))) {
      throw new Error(`Session ${input.sessionId} not found`);
    }
    if (!(await db.exercises.get(input.exerciseId))) {
      throw new Error(`Exercise ${input.exerciseId} not found`);
    }
    const existing = await db.sets.where('sessionId').equals(input.sessionId).toArray();
    const order =
      input.order ??
      existing
        .filter((s) => s.exerciseId === input.exerciseId)
        .reduce((next, s) => Math.max(next, s.order + 1), 0);

    const set: SessionSet = {
      id: newId(),
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      order,
      weightGrams: input.weightGrams,
      reps: input.reps,
      createdAt: now,
    };
    await db.sets.add(set);
    return set;
  });
}

/** Edits weight/reps of a stored set. `createdAt` is kept, so "oldest record wins" still holds. */
export async function updateSetValues(db: LiftDB, id: string, values: SetValues): Promise<void> {
  assertValidSetValues(values.weightGrams, values.reps);
  const updated = await db.sets.update(id, values);
  if (updated === 0) throw new Error(`Set ${id} not found`);
}

export function deleteSet(db: LiftDB, id: string): Promise<void> {
  return db.sets.delete(id);
}

export function listSetsForSession(db: LiftDB, sessionId: string): Promise<SessionSet[]> {
  return db.sets.where('sessionId').equals(sessionId).toArray();
}

export function listSetsForExercise(db: LiftDB, exerciseId: string): Promise<SessionSet[]> {
  return db.sets.where('exerciseId').equals(exerciseId).toArray();
}

export function listAllSets(db: LiftDB): Promise<SessionSet[]> {
  return db.sets.toArray();
}
