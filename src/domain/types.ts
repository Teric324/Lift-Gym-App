// Domain types. Weights are integer grams, times are epoch milliseconds.

export interface Exercise {
  id: string;
  name: string;
  /** Weight step used by the picker, in grams. */
  stepGrams: number;
  /** Archived exercises are hidden from pickers but keep their history and PR. */
  archived: boolean;
}

export const WORKOUT_ICONS = ['generic', 'push', 'pull', 'legs', 'fullbody'] as const;
export type WorkoutIcon = (typeof WORKOUT_ICONS)[number];

/** A reusable routine. It only points to registry exercises; it never owns history. */
export interface Workout {
  id: string;
  name: string;
  exerciseIds: string[];
  /** Archived routines are hidden from the main list but never deleted, so a session's
   * `workoutId` always resolves. */
  archived: boolean;
  /** Picture shown next to the routine's name. */
  icon: WorkoutIcon;
}

export interface Session {
  id: string;
  workoutId: string;
  /** Local calendar date, "YYYY-MM-DD". */
  date: string;
  startedAt: number;
  /** null while the session is still active. */
  finishedAt: number | null;
}

/** A checked set. Unchecked sets are never stored. */
export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  /** Position of the set within its exercise in the session, 0-based. */
  order: number;
  weightGrams: number;
  reps: number;
  createdAt: number;
}

/** How an exercise ended up in the active session. */
export type DraftItemOrigin = 'routine' | 'added' | 'replacement';

/**
 * One editable row of the session plan. It becomes a real set (`SessionSet`) only when checked;
 * until then it lives in the draft and never counts for PR or history.
 */
export interface DraftRow {
  id: string;
  /** null = not filled in yet (a blank row). */
  weightGrams: number | null;
  reps: number | null;
  /** Id of the stored set while the row is checked, otherwise null. */
  checkedSetId: string | null;
}

export interface DraftItem {
  exerciseId: string;
  origin: DraftItemOrigin;
  /** Set when origin is "replacement": the routine exercise this one stands in for today. */
  replacesExerciseId: string | null;
  /** Skipped exercises stay visible in the draft but record nothing. */
  skipped: boolean;
  /** The session plan for this exercise, copied from its last session and then editable. */
  rows: DraftRow[];
}

/**
 * Working state of the active session, stored apart from the checked sets so it survives the
 * app being closed. Its order is the order the user sees; it is deleted when the session ends.
 */
export interface SessionDraft {
  sessionId: string;
  items: DraftItem[];
  updatedAt: number;
}
