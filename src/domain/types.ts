// Domain types. Weights are integer grams, times are epoch milliseconds.

export interface Exercise {
  id: string;
  name: string;
  /** Weight step used by the picker, in grams. */
  stepGrams: number;
  /** Archived exercises are hidden from pickers but keep their history and PR. */
  archived: boolean;
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
