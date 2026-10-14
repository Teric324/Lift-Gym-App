import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { LiftDB } from './schema';

const names: string[] = [];
const open: Dexie[] = [];
let n = 0;
const freshName = () => {
  const name = `lift-schema-test-${++n}`;
  names.push(name);
  return name;
};

afterEach(async () => {
  open.splice(0).forEach((d) => d.close());
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)));
});

/** The database exactly as version 1 of the app created it (a frozen copy of the v1 schema). */
class DbV1 extends Dexie {
  constructor(name: string) {
    super(name);
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

describe('schema version 2 upgrade', () => {
  it('keeps every existing record and gives workouts archived: false', async () => {
    const name = freshName();
    const v1 = new DbV1(name);
    await v1
      .table('exercises')
      .add({ id: 'e1', name: 'Bench press', stepGrams: 2500, archived: false });
    await v1.table('workouts').bulkAdd([
      { id: 'w1', name: 'Push', exerciseIds: ['e1'] },
      { id: 'w2', name: 'Pull', exerciseIds: [] },
    ]);
    await v1.table('sessions').add({
      id: 's1',
      workoutId: 'w1',
      date: '2026-10-05',
      startedAt: 1,
      finishedAt: 2,
    });
    await v1.table('sets').add({
      id: 'x1',
      sessionId: 's1',
      exerciseId: 'e1',
      order: 0,
      weightGrams: 27250,
      reps: 8,
      createdAt: 3,
    });
    await v1.table('meta').put({ key: 'exercisesSeeded', value: true });
    v1.close();

    const db = new LiftDB(name);
    open.push(db);
    const workouts = await db.workouts.orderBy('id').toArray();
    expect(workouts).toEqual([
      { id: 'w1', name: 'Push', exerciseIds: ['e1'], archived: false },
      { id: 'w2', name: 'Pull', exerciseIds: [], archived: false },
    ]);
    expect(await db.exercises.count()).toBe(1);
    expect(await db.sessions.count()).toBe(1);
    expect((await db.sets.get('x1'))?.weightGrams).toBe(27250);
    expect((await db.meta.get('exercisesSeeded'))?.value).toBe(true);
    expect(db.verno).toBe(2);
  });

  it('does not overwrite an archived flag that is already set', async () => {
    const name = freshName();
    const v1 = new DbV1(name);
    await v1.table('workouts').add({ id: 'w1', name: 'Old', exerciseIds: [], archived: true });
    v1.close();
    const db = new LiftDB(name);
    open.push(db);
    expect((await db.workouts.get('w1'))?.archived).toBe(true);
  });

  it('opens a brand new database at the latest version', async () => {
    const db = new LiftDB(freshName());
    open.push(db);
    await db.open();
    expect(db.verno).toBe(2);
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'drafts',
      'exercises',
      'meta',
      'sessions',
      'sets',
      'workouts',
    ]);
  });
});

describe('versionchange', () => {
  it('closes the open connection so a newer schema can upgrade (and tells the app)', async () => {
    const name = freshName();
    const db = new LiftDB(name);
    open.push(db);
    let notified = 0;
    db.onVersionChange = () => notified++;
    await db.open();
    await db.workouts.add({ id: 'w1', name: 'Push', exerciseIds: [], archived: false });

    // Another tab runs a newer version of the app that wants schema version 3.
    const v3Stores: Record<string, string> = {
      exercises: 'id, name',
      workouts: 'id',
      sessions: 'id, date, workoutId',
      sets: 'id, sessionId, exerciseId, createdAt',
      drafts: 'sessionId',
      meta: 'key',
      extra: 'id',
    };
    class Future extends Dexie {
      constructor() {
        super(name);
        this.version(3).stores(v3Stores);
      }
    }
    const future = new Future();
    open.push(future as unknown as Dexie);
    const upgraded = await Promise.race([
      future.open().then(() => 'upgraded'),
      new Promise((resolve) => setTimeout(() => resolve('blocked'), 2000)),
    ]);

    expect(upgraded).toBe('upgraded');
    expect(db.isOpen()).toBe(false);
    expect(notified).toBe(1);
    // The data survived the upgrade done by the other connection.
    expect(await future.table('workouts').count()).toBe(1);
  });
});
