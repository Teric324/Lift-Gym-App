// Domain types. Weights are integer grams, times are epoch milliseconds.

export interface Exercise {
  id: string;
  name: string;
  /** Weight step used by the picker, in grams. */
  stepGrams: number;
  /** Archived exercises are hidden from pickers but keep their history and PR. */
  archived: boolean;
}

/** A reusable routine. It only points to registry exercises; it never owns history. */
export interface Workout {
  id: string;
  name: string;
  exerciseIds: string[];
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

export interface DraftItem {
  exerciseId: string;
  origin: DraftItemOrigin;
  /** Set when origin is "replacement": the routine exercise this one stands in for today. */
  replacesExerciseId: string | null;
  /** Skipped exercises stay visible in the draft but record nothing. */
  skipped: boolean;
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
