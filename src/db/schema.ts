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

  /**
   * Called after this connection was closed because another tab/window opened a newer schema
   * version. The old page can no longer use the database, so the app reloads itself here.
   */
  onVersionChange?: () => void;

  constructor(name = 'lift') {
    super(name);

    // Another connection (a newer version of the app in a second tab or an installed copy) is
    // upgrading the schema: close ours right away, otherwise its upgrade stays blocked.
    this.on('versionchange', () => {
      this.close();
      this.onVersionChange?.();
      return false; // we closed the connection ourselves; skip Dexie's own default handler
    });

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

    // NEVER edit a block above. Schema changes are new version() blocks with an upgrade.

    // v2: workouts can be archived. The field is not indexed, so the table list is unchanged;
    // the upgrade only gives existing workouts an explicit `archived: false`.
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('workouts')
          .toCollection()
          .modify((workout: { archived?: boolean }) => {
            if (workout.archived === undefined) workout.archived = false;
          }),
      );
  }
}
