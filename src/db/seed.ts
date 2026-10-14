import { DEFAULT_STEP_GRAMS } from '../domain/weight';
import type { Exercise } from '../domain/types';
import type { LiftDB } from './schema';

const SEEDED_KEY = 'exercisesSeeded';

const STARTER_NAMES = [
  'Bench press',
  'Incline bench press',
  'Incline dumbbell press',
  'Chest fly',
  'Dips',
  'Overhead press',
  'Lateral raise',
  'Triceps pushdown',
  'Barbell row',
  'Lat pulldown',
  'Pull-up',
  'Seated cable row',
  'Biceps curl',
  'Hammer curl',
  'Squat',
  'Deadlift',
  'Romanian deadlift',
  'Leg press',
  'Leg curl',
  'Calf raise',
] as const;

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Starter exercises. Ids are fixed ("seed:bench-press") so the PC and the Mac that each seed
 * their own database end up with the same exercise ids and a later import does not duplicate.
 */
export const STARTER_EXERCISES: readonly Exercise[] = STARTER_NAMES.map((name) => ({
  id: `seed:${slug(name)}`,
  name,
  stepGrams: DEFAULT_STEP_GRAMS,
  archived: false,
}));

/**
 * Loads the starter list once. A flag in the database records that it happened, so it never runs
 * again, even if the user archives or renames every starter exercise. Returns true if it seeded.
 */
export function seedStarterExercises(db: LiftDB): Promise<boolean> {
  return db.transaction('rw', db.exercises, db.meta, async () => {
    if (await db.meta.get(SEEDED_KEY)) return false;
    // A database that already has exercises (e.g. restored from a backup) keeps only its own.
    if ((await db.exercises.count()) === 0) await db.exercises.bulkAdd([...STARTER_EXERCISES]);
    await db.meta.put({ key: SEEDED_KEY, value: true });
    return true;
  });
}
