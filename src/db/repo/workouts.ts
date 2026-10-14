import { newId } from '../../domain/id';
import type { Workout } from '../../domain/types';
import type { LiftDB } from '../schema';

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') throw new Error('Workout name is required');
  return trimmed;
}

async function assertExercisesExist(db: LiftDB, exerciseIds: readonly string[]): Promise<void> {
  const found = await db.exercises.bulkGet([...exerciseIds]);
  const missing = exerciseIds.filter((_, i) => found[i] === undefined);
  if (missing.length > 0) throw new Error(`Unknown exercise id(s): ${missing.join(', ')}`);
}

export async function listWorkouts(db: LiftDB): Promise<Workout[]> {
  const all = await db.workouts.toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkout(db: LiftDB, id: string): Promise<Workout | undefined> {
  return db.workouts.get(id);
}

export async function createWorkout(
  db: LiftDB,
  name: string,
  exerciseIds: readonly string[] = [],
): Promise<Workout> {
  const clean = cleanName(name);
  return db.transaction('rw', db.workouts, db.exercises, async () => {
    await assertExercisesExist(db, exerciseIds);
    const workout: Workout = { id: newId(), name: clean, exerciseIds: [...exerciseIds] };
    await db.workouts.add(workout);
    return workout;
  });
}

export async function renameWorkout(db: LiftDB, id: string, name: string): Promise<void> {
  const updated = await db.workouts.update(id, { name: cleanName(name) });
  if (updated === 0) throw new Error(`Workout ${id} not found`);
}

/** Replaces the routine's exercise list (and its order). Past sessions are not affected. */
export async function setWorkoutExercises(
  db: LiftDB,
  id: string,
  exerciseIds: readonly string[],
): Promise<void> {
  await db.transaction('rw', db.workouts, db.exercises, async () => {
    await assertExercisesExist(db, exerciseIds);
    const updated = await db.workouts.update(id, { exerciseIds: [...exerciseIds] });
    if (updated === 0) throw new Error(`Workout ${id} not found`);
  });
}
