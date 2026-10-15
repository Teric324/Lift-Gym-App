import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPR } from '../domain/pr';
import { prefillForExercises } from '../domain/prefill';
import type { Exercise, Session, Workout } from '../domain/types';
import { exportBackup, importBackup, parseBackupText, serializeBackup } from './backup';
import { addExercise } from './repo/exercises';
import {
  addSetToFinishedSession,
  deleteSession,
  deleteSetFromFinishedSession,
  finishSession,
  getActiveSession,
  listFinishedSessions,
  startSession,
} from './repo/sessions';
import { addSet, listAllSets, listSetsForSession, updateSetValues } from './repo/sets';
import { createWorkout } from './repo/workouts';
import { LiftDB } from './schema';

let db: LiftDB;
let n = 0;

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 1, 18, 0).getTime();

beforeEach(() => {
  db = new LiftDB(`lift-history-test-${++n}`);
});

afterEach(async () => {
  await db.delete();
});

interface World {
  bench: Exercise;
  fly: Exercise;
  push: Workout;
  first: Session;
  second: Session;
  third: Session;
}

/**
 * Three finished sessions of "Push", a week apart:
 *   first : bench 100x5            fly 20x12
 *   second: bench 105x3, 90x8      fly 22.5x10
 *   third : bench 110x2            (newest)
 */
async function world(): Promise<World> {
  const bench = await addExercise(db, 'Bench press');
  const fly = await addExercise(db, 'Cable fly');
  const push = await createWorkout(db, 'Push', [bench.id, fly.id]);

  const make = async (at: number, entries: [Exercise, number, number][]) => {
    const { session } = await startSession(db, push.id, at);
    let t = at;
    let order = 0;
    for (const [exercise, kg, reps] of entries) {
      await addSet(
        db,
        {
          sessionId: session.id,
          exerciseId: exercise.id,
          weightGrams: kg * 1000,
          reps,
          order: order++,
        },
        (t += 1000),
      );
    }
    await finishSession(db, session.id, t + 1000);
    return (await db.sessions.get(session.id))!;
  };

  const first = await make(T0, [
    [bench, 100, 5],
    [fly, 20, 12],
  ]);
  const second = await make(T0 + 7 * DAY, [
    [bench, 105, 3],
    [bench, 90, 8],
    [fly, 22.5, 10],
  ]);
  const third = await make(T0 + 14 * DAY, [[bench, 110, 2]]);
  return { bench, fly, push, first, second, third };
}

const nextPrefill = async (exerciseId: string) => {
  const sessions = await db.sessions.toArray();
  const sets = await listAllSets(db);
  return prefillForExercises([exerciseId], sessions, sets).get(exerciseId)!;
};

describe('listFinishedSessions', () => {
  it('lists finished sessions newest first and leaves out the active one', async () => {
    const w = await world();
    await startSession(db, w.push.id, T0 + 21 * DAY);
    const finished = await listFinishedSessions(db);
    expect(finished.map((s) => s.id)).toEqual([w.third.id, w.second.id, w.first.id]);
    expect(await getActiveSession(db)).toBeDefined();
  });
});

describe('correcting a set in an old session', () => {
  it('changes the record and the next pre-fill when it is the latest session of the exercise', async () => {
    const w = await world();
    // Fly was last done in the second session: 22.5 x 10.
    expect((await nextPrefill(w.fly.id)).map((r) => [r.weightGrams, r.reps])).toEqual([
      [22500, 10],
    ]);
    const flySet = (await listSetsForSession(db, w.second.id)).find(
      (s) => s.exerciseId === w.fly.id,
    )!;

    await updateSetValues(db, flySet.id, { weightGrams: 25000, reps: 8 });

    expect((await nextPrefill(w.fly.id)).map((r) => [r.weightGrams, r.reps])).toEqual([[25000, 8]]);
    expect(getPR(w.fly.id, await listAllSets(db))).toMatchObject({ weightGrams: 25000, reps: 8 });
  });

  it('recalculates the bench record when the record set is corrected down', async () => {
    const w = await world();
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({ weightGrams: 110000 });
    const record = (await listSetsForSession(db, w.third.id))[0]!;

    await updateSetValues(db, record.id, { weightGrams: 95000, reps: 2 });

    // The best is now 105 x 3 from the second session.
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({
      weightGrams: 105000,
      reps: 3,
    });
    expect((await nextPrefill(w.bench.id)).map((r) => r.weightGrams)).toEqual([95000]);
  });

  it('does not change the pre-fill when the corrected session is not the latest one', async () => {
    const w = await world();
    const before = await nextPrefill(w.bench.id);
    const old = (await listSetsForSession(db, w.first.id)).find(
      (s) => s.exerciseId === w.bench.id,
    )!;
    await updateSetValues(db, old.id, { weightGrams: 120000, reps: 1 });
    expect(await nextPrefill(w.bench.id)).toEqual(before);
    // ...but it becomes the record.
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({ weightGrams: 120000 });
  });
});

describe('deleting sets and sessions', () => {
  it('deleting one set of a session keeps the session', async () => {
    const w = await world();
    const sets = await listSetsForSession(db, w.second.id);
    const result = await deleteSetFromFinishedSession(db, sets[0]!.id);
    expect(result).toEqual({ sessionDeleted: false });
    expect(await listSetsForSession(db, w.second.id)).toHaveLength(sets.length - 1);
    expect((await listFinishedSessions(db)).map((s) => s.id)).toContain(w.second.id);
  });

  it('deleting the only set of a session deletes the session, and pre-fill falls back', async () => {
    const w = await world();
    const only = (await listSetsForSession(db, w.third.id))[0]!;

    const result = await deleteSetFromFinishedSession(db, only.id);

    expect(result).toEqual({ sessionDeleted: true });
    expect((await listFinishedSessions(db)).map((s) => s.id)).toEqual([w.second.id, w.first.id]);
    // Bench pre-fill is now the second session: 105 x 3, 90 x 8.
    expect((await nextPrefill(w.bench.id)).map((r) => [r.weightGrams, r.reps])).toEqual([
      [105000, 3],
      [90000, 8],
    ]);
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({ weightGrams: 105000 });
  });

  it('deleting a whole session removes its sets and lowers the record', async () => {
    const w = await world();
    await deleteSession(db, w.third.id);
    expect((await listAllSets(db)).filter((s) => s.sessionId === w.third.id)).toEqual([]);
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({
      weightGrams: 105000,
      reps: 3,
    });
    // The routine and the exercises are untouched.
    expect(await db.workouts.get(w.push.id)).toBeDefined();
    expect(await db.exercises.get(w.bench.id)).toBeDefined();
  });

  it('an unknown set is an error', async () => {
    await world();
    await expect(deleteSetFromFinishedSession(db, 'ghost')).rejects.toThrow(/not found/);
  });
});

describe('adding a set to an old session', () => {
  it('gets the next order and a moment right after the session, before the next session', async () => {
    const w = await world();
    const before = await listSetsForSession(db, w.first.id);
    const lastBefore = Math.max(...before.map((s) => s.createdAt));

    await addSetToFinishedSession(db, {
      sessionId: w.first.id,
      exerciseId: w.bench.id,
      weightGrams: 100000,
      reps: 5,
    });

    const after = await listSetsForSession(db, w.first.id);
    expect(after).toHaveLength(before.length + 1);
    const added = after.find((s) => !before.some((b) => b.id === s.id))!;
    expect(added.order).toBe(1); // bench had one set (order 0)
    expect(added.createdAt).toBeGreaterThan(Math.max(lastBefore, w.first.finishedAt!) - 1);
    expect(added.createdAt).toBeLessThan(w.second.startedAt);
  });

  it('an identical set added to an old session does not take the record from the older one', async () => {
    const w = await world();
    const original = (await listSetsForSession(db, w.third.id))[0]!; // 110 x 2, the record
    await addSetToFinishedSession(db, {
      sessionId: w.first.id,
      exerciseId: w.bench.id,
      weightGrams: 110000,
      reps: 2,
    });
    // Both are 110 x 2. The one in the first session is chronologically older, so it is the record.
    const record = getPR(w.bench.id, await listAllSets(db))!;
    expect(record.sessionId).toBe(w.first.id);
    expect(record.id).not.toBe(original.id);
  });

  it('refuses an exercise that has no sets there, an active session and invalid values', async () => {
    const w = await world();
    await expect(
      addSetToFinishedSession(db, {
        sessionId: w.third.id,
        exerciseId: w.fly.id,
        weightGrams: 20000,
        reps: 10,
      }),
    ).rejects.toThrow(/no sets in this session/);

    const active = await startSession(db, w.push.id, T0 + 30 * DAY);
    await expect(
      addSetToFinishedSession(db, {
        sessionId: active.session.id,
        exerciseId: w.bench.id,
        weightGrams: 1000,
        reps: 5,
      }),
    ).rejects.toThrow(/still active/);

    await expect(
      addSetToFinishedSession(db, {
        sessionId: w.first.id,
        exerciseId: w.bench.id,
        weightGrams: 1000,
        reps: 0,
      }),
    ).rejects.toThrow(RangeError);
  });
});

describe('export and import after history edits', () => {
  it('a corrected, shortened and partly deleted history survives a backup round trip', async () => {
    const w = await world();
    const flySet = (await listSetsForSession(db, w.second.id)).find(
      (s) => s.exerciseId === w.fly.id,
    )!;
    await updateSetValues(db, flySet.id, { weightGrams: 25000, reps: 8 });
    await addSetToFinishedSession(db, {
      sessionId: w.first.id,
      exerciseId: w.bench.id,
      weightGrams: 97500,
      reps: 6,
    });
    await deleteSetFromFinishedSession(db, (await listSetsForSession(db, w.third.id))[0]!.id);
    await deleteSession(db, w.first.id);

    const exported = await exportBackup(db, T0 + 40 * DAY);
    const parsed = parseBackupText(serializeBackup(exported));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const other = new LiftDB(`lift-history-test-restore-${n}`);
    try {
      await importBackup(other, parsed.backup);
      const sort = <T extends { id: string }>(items: T[]) =>
        [...items].sort((a, b) => a.id.localeCompare(b.id));
      expect(sort(await other.sets.toArray())).toEqual(sort(await listAllSets(db)));
      expect(sort(await other.sessions.toArray())).toEqual(sort(await db.sessions.toArray()));
      expect(getPR(w.bench.id, await other.sets.toArray())).toEqual(
        getPR(w.bench.id, await listAllSets(db)),
      );
    } finally {
      await other.delete();
    }
  });
});
