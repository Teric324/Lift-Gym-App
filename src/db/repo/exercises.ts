import { newId } from '../../domain/id';
import type { Exercise } from '../../domain/types';
import { DEFAULT_STEP_GRAMS } from '../../domain/weight';
import type { LiftDB } from '../schema';

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') throw new Error('Exercise name is required');
  return trimmed;
}

function assertStep(stepGrams: number): void {
  if (!Number.isInteger(stepGrams) || stepGrams <= 0) {
    throw new RangeError('Step must be a positive whole number of grams');
  }
}

async function assertNameFree(db: LiftDB, name: string, exceptId?: string): Promise<void> {
  const wanted = name.toLowerCase();
  const clash = await db.exercises
    .filter((e) => e.id !== exceptId && e.name.toLowerCase() === wanted)
    .first();
  if (clash) throw new Error(`An exercise named "${clash.name}" already exists`);
}

/** Sorted by name. Archived exercises are left out unless asked for. */
export async function listExercises(
  db: LiftDB,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Exercise[]> {
  const all = await db.exercises.toArray();
  return all
    .filter((e) => includeArchived || !e.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Case-insensitive match on the trimmed name, archived exercises included. */
export async function findExerciseByName(db: LiftDB, name: string): Promise<Exercise | undefined> {
  const wanted = name.trim().replace(/\s+/g, ' ').toLowerCase();
  if (wanted === '') return undefined;
  return db.exercises.filter((e) => e.name.toLowerCase() === wanted).first();
}

export function getExercise(db: LiftDB, id: string): Promise<Exercise | undefined> {
  return db.exercises.get(id);
}

export async function addExercise(
  db: LiftDB,
  name: string,
  stepGrams: number = DEFAULT_STEP_GRAMS,
): Promise<Exercise> {
  const clean = cleanName(name);
  assertStep(stepGrams);
  return db.transaction('rw', db.exercises, async () => {
    await assertNameFree(db, clean);
    const exercise: Exercise = { id: newId(), name: clean, stepGrams, archived: false };
    await db.exercises.add(exercise);
    return exercise;
  });
}

async function update(db: LiftDB, id: string, changes: Partial<Omit<Exercise, 'id'>>) {
  const updated = await db.exercises.update(id, changes);
  if (updated === 0) throw new Error(`Exercise ${id} not found`);
}

export async function renameExercise(db: LiftDB, id: string, name: string): Promise<void> {
  const clean = cleanName(name);
  await db.transaction('rw', db.exercises, async () => {
    await assertNameFree(db, clean, id);
    await update(db, id, { name: clean });
  });
}

/** Archive hides the exercise from pickers; its sets, history and PR are untouched. */
export function setExerciseArchived(db: LiftDB, id: string, archived: boolean): Promise<void> {
  return update(db, id, { archived });
}
