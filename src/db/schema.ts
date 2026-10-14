import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, Session, SessionDraft, SessionSet, Workout } from '../domain/types';

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class LiftDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  /** Checked sets only. */
  sets!: EntityTable<SessionSet, 'id'>;
  /** At most one draft per active session. */
  drafts!: EntityTable<SessionDraft, 'sessionId'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name = 'lift') {
    super(name);
    // Only indexed fields are listed. Booleans and null are not valid IndexedDB keys, so
    // `archived` and `finishedAt` are filtered in code.
    this.version(1).stores({
      exercises: 'id, name',
      workouts: 'id',
      sessions: 'id, date, workoutId',
      sets: 'id, sessionId, exerciseId, createdAt',
      drafts: 'sessionId',
      meta: 'key',
    });
  }
}
