import { newId } from '../../domain/id';
import type { Workout, WorkoutIcon } from '../../domain/types';
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

/** Sorted by name. Archived routines are left out unless asked for. */
export async function listWorkouts(
  db: LiftDB,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Workout[]> {
  const all = await db.workouts.toArray();
  return all
    .filter((w) => includeArchived || !w.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Routines that contain the exercise (archived ones too if asked). */
export async function listWorkoutsUsingExercise(
  db: LiftDB,
  exerciseId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Workout[]> {
  const all = await listWorkouts(db, { includeArchived });
  return all.filter((w) => w.exerciseIds.includes(exerciseId));
}

export function getWorkout(db: LiftDB, id: string): Promise<Workout | undefined> {
  return db.workouts.get(id);
}

export async function createWorkout(
  db: LiftDB,
  name: string,
  exerciseIds: readonly string[] = [],
  icon: WorkoutIcon = 'generic',
): Promise<Workout> {
  const clean = cleanName(name);
  return db.transaction('rw', db.workouts, db.exercises, async () => {
    await assertExercisesExist(db, exerciseIds);
    const workout: Workout = {
      id: newId(),
      name: clean,
      exerciseIds: [...exerciseIds],
      archived: false,
      icon,
    };
    await db.workouts.add(workout);
    return workout;
  });
}

export async function renameWorkout(db: LiftDB, id: string, name: string): Promise<void> {
  const updated = await db.workouts.update(id, { name: cleanName(name) });
  if (updated === 0) throw new Error(`Workout ${id} not found`);
}

export async function setWorkoutIcon(db: LiftDB, id: string, icon: WorkoutIcon): Promise<void> {
  const updated = await db.workouts.update(id, { icon });
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

/** Archiving hides a routine from the main list. It is never deleted, so sessions keep it. */
export async function setWorkoutArchived(db: LiftDB, id: string, archived: boolean): Promise<void> {
  const updated = await db.workouts.update(id, { archived });
  if (updated === 0) throw new Error(`Workout ${id} not found`);
}

/**
 * Changes a routine's exercise list from its current value (add, remove or reorder), in one
 * transaction. Duplicates are dropped and every id must exist.
 */
export async function updateWorkoutExercises(
  db: LiftDB,
  id: string,
  update: (current: readonly string[]) => readonly string[],
): Promise<string[]> {
  return db.transaction('rw', db.workouts, db.exercises, async () => {
    const workout = await db.workouts.get(id);
    if (!workout) throw new Error(`Workout ${id} not found`);
    const next = [...new Set(update(workout.exerciseIds))];
    await assertExercisesExist(db, next);
    await db.workouts.update(id, { exerciseIds: next });
    return next;
  });
}
