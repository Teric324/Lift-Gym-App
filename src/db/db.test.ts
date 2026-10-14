import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prefillForExercises } from '../domain/prefill';
import { getPR } from '../domain/pr';
import { DEFAULT_STEP_GRAMS } from '../domain/weight';
import {
  addExercise,
  listExercises,
  renameExercise,
  setExerciseArchived,
  setExerciseStep,
} from './repo/exercises';
import {
  addExerciseToDraft,
  checkDraftRow,
  deleteDraft,
  getDraft,
  saveDraft,
  uncheckDraftRow,
  updateDraftRow,
} from './repo/drafts';
import {
  ActiveSessionExistsError,
  deleteSession,
  finishSession,
  getActiveSession,
  listSessions,
  startSession,
} from './repo/sessions';
import {
  addSet,
  deleteSet,
  listAllSets,
  listSetsForExercise,
  listSetsForSession,
  updateSetValues,
} from './repo/sets';
import { createWorkout, listWorkouts, renameWorkout, setWorkoutExercises } from './repo/workouts';
import { STARTER_EXERCISES, seedStarterExercises } from './seed';
import { LiftDB } from './schema';

let db: LiftDB;
let dbName: string;
let counter = 0;

beforeEach(() => {
  dbName = `lift-test-${++counter}`;
  db = new LiftDB(dbName);
});

afterEach(async () => {
  await db.delete();
});

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 5, 18, 0).getTime();

describe('seed', () => {
  it('loads about 20 starter exercises with the default 2.5 kg step', async () => {
    expect(await seedStarterExercises(db)).toBe(true);
    const all = await listExercises(db);
    expect(all).toHaveLength(STARTER_EXERCISES.length);
    expect(all.length).toBeGreaterThanOrEqual(18);
    expect(all.length).toBeLessThanOrEqual(24);
    expect(all.every((e) => e.stepGrams === 2500 && e.archived === false)).toBe(true);
    const names = all.map((e) => e.name);
    expect(names).toEqual(
      expect.arrayContaining(['Bench press', 'Incline dumbbell press', 'Dips', 'Leg press']),
    );
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
  });

  it('runs only once: not again on the next open, even after archive or rename', async () => {
    await seedStarterExercises(db);
    const [first] = await listExercises(db);
    await setExerciseArchived(db, first!.id, true);
    await renameExercise(db, STARTER_EXERCISES[1]!.id, 'My incline');

    expect(await seedStarterExercises(db)).toBe(false);

    // A fresh connection to the same database, as after closing and reopening the app.
    db.close();
    db = new LiftDB(dbName);
    expect(await seedStarterExercises(db)).toBe(false);

    const all = await listExercises(db, { includeArchived: true });
    expect(all).toHaveLength(STARTER_EXERCISES.length);
    expect(all.find((e) => e.id === first!.id)?.archived).toBe(true);
    expect(all.find((e) => e.id === STARTER_EXERCISES[1]!.id)?.name).toBe('My incline');
  });

  it('does not add starters to a database that already has exercises', async () => {
    await addExercise(db, 'Restored exercise');
    await seedStarterExercises(db);
    expect((await listExercises(db)).map((e) => e.name)).toEqual(['Restored exercise']);
  });

  it('starter exercises are easy to archive and leave the others alone', async () => {
    await seedStarterExercises(db);
    await setExerciseArchived(db, 'seed:dips', true);
    const visible = await listExercises(db);
    expect(visible).toHaveLength(STARTER_EXERCISES.length - 1);
    expect(visible.find((e) => e.name === 'Dips')).toBeUndefined();
    await setExerciseArchived(db, 'seed:dips', false);
    expect(await listExercises(db)).toHaveLength(STARTER_EXERCISES.length);
  });
});

describe('exercises', () => {
  it('adds with the default step, trims names and rejects duplicates and bad input', async () => {
    const e = await addExercise(db, '  Cable   crunch ');
    expect(e).toMatchObject({
      name: 'Cable crunch',
      stepGrams: DEFAULT_STEP_GRAMS,
      archived: false,
    });
    await expect(addExercise(db, 'cable CRUNCH')).rejects.toThrow(/already exists/);
    await expect(addExercise(db, '   ')).rejects.toThrow(/required/);
    await expect(addExercise(db, 'X', 0)).rejects.toThrow(RangeError);
    await expect(addExercise(db, 'Y', 2.5)).rejects.toThrow(RangeError);
  });

  it('renames, changes the step and keeps the id', async () => {
    const e = await addExercise(db, 'Row');
    await renameExercise(db, e.id, 'Barbell row');
    await setExerciseStep(db, e.id, 1250);
    const [stored] = await listExercises(db);
    expect(stored).toEqual({ id: e.id, name: 'Barbell row', stepGrams: 1250, archived: false });
    await expect(renameExercise(db, 'nope', 'Z')).rejects.toThrow(/not found/);
  });

  it('archiving keeps the history and the PR', async () => {
    const e = await addExercise(db, 'Old machine');
    const w = await createWorkout(db, 'Day', [e.id]);
    const { session } = await startSession(db, w.id, T0);
    await addSet(db, { sessionId: session.id, exerciseId: e.id, weightGrams: 90000, reps: 6 }, T0);
    await finishSession(db, session.id, T0 + 1000);

    await setExerciseArchived(db, e.id, true);

    expect(await listExercises(db)).toEqual([]);
    expect(await listExercises(db, { includeArchived: true })).toHaveLength(1);
    const sets = await listSetsForExercise(db, e.id);
    expect(getPR(e.id, sets)).toMatchObject({ weightGrams: 90000, reps: 6 });
  });
});

describe('workouts', () => {
  it('creates, renames and reorders exercises of a routine', async () => {
    const a = await addExercise(db, 'A');
    const b = await addExercise(db, 'B');
    const w = await createWorkout(db, ' Push ', [a.id, b.id]);
    expect(w.name).toBe('Push');
    await setWorkoutExercises(db, w.id, [b.id, a.id]);
    await renameWorkout(db, w.id, 'Push day');
    expect(await listWorkouts(db)).toEqual([
      { id: w.id, name: 'Push day', exerciseIds: [b.id, a.id], archived: false },
    ]);
  });

  it('rejects unknown exercise ids', async () => {
    await expect(createWorkout(db, 'Bad', ['missing'])).rejects.toThrow(/Unknown exercise/);
  });
});

describe('sets', () => {
  async function setup() {
    const bench = await addExercise(db, 'Bench press');
    const w = await createWorkout(db, 'Push', [bench.id]);
    const { session } = await startSession(db, w.id, T0);
    return { bench, w, session };
  }

  it('stores checked sets with createdAt and a per-exercise order', async () => {
    const { bench, session } = await setup();
    const s1 = await addSet(
      db,
      { sessionId: session.id, exerciseId: bench.id, weightGrams: 60000, reps: 8 },
      111,
    );
    const s2 = await addSet(
      db,
      { sessionId: session.id, exerciseId: bench.id, weightGrams: 62500, reps: 6 },
      222,
    );
    expect([s1.order, s2.order]).toEqual([0, 1]);
    expect([s1.createdAt, s2.createdAt]).toEqual([111, 222]);
    expect(await listSetsForSession(db, session.id)).toHaveLength(2);
  });

  it('accepts 0 kg and rejects invalid weight or reps', async () => {
    const { bench, session } = await setup();
    const base = { sessionId: session.id, exerciseId: bench.id };
    await expect(addSet(db, { ...base, weightGrams: 0, reps: 10 })).resolves.toBeDefined();
    await expect(addSet(db, { ...base, weightGrams: 1000, reps: 0 })).rejects.toThrow(RangeError);
    await expect(addSet(db, { ...base, weightGrams: 1000, reps: 101 })).rejects.toThrow(RangeError);
    await expect(addSet(db, { ...base, weightGrams: -1, reps: 5 })).rejects.toThrow(RangeError);
    await expect(addSet(db, { ...base, weightGrams: 27.5, reps: 5 })).rejects.toThrow(RangeError);
    await expect(addSet(db, { ...base, weightGrams: 1000, reps: 5.5 })).rejects.toThrow(RangeError);
    expect(await listSetsForSession(db, session.id)).toHaveLength(1);
  });

  it('rejects sets for an unknown session or exercise', async () => {
    const { bench, session } = await setup();
    await expect(
      addSet(db, { sessionId: 'nope', exerciseId: bench.id, weightGrams: 1000, reps: 5 }),
    ).rejects.toThrow(/Session/);
    await expect(
      addSet(db, { sessionId: session.id, exerciseId: 'nope', weightGrams: 1000, reps: 5 }),
    ).rejects.toThrow(/Exercise/);
  });

  it('PR follows edits and deletes because it is computed from stored sets', async () => {
    const { bench, session } = await setup();
    const base = { sessionId: session.id, exerciseId: bench.id };
    const low = await addSet(db, { ...base, weightGrams: 100000, reps: 5 }, 1);
    const record = await addSet(db, { ...base, weightGrams: 120000, reps: 3 }, 2);

    expect(getPR(bench.id, await listAllSets(db))?.id).toBe(record.id);

    await updateSetValues(db, record.id, { weightGrams: 90000, reps: 3 });
    const edited = (await listAllSets(db)).find((s) => s.id === record.id)!;
    expect(edited.createdAt).toBe(2);
    expect(getPR(bench.id, await listAllSets(db))?.id).toBe(low.id);

    await deleteSet(db, low.id);
    expect(getPR(bench.id, await listAllSets(db))?.id).toBe(record.id);
  });
});

describe('sessions and drafts', () => {
  async function setup() {
    const a = await addExercise(db, 'A');
    const b = await addExercise(db, 'B');
    const c = await addExercise(db, 'C');
    const w = await createWorkout(db, 'Day', [a.id, b.id]);
    return { a, b, c, w };
  }

  it('startSession stores the local date, no finish time and a draft of the routine', async () => {
    const { a, b, w } = await setup();
    const now = new Date(2026, 9, 14, 0, 30).getTime();
    const { session, draft } = await startSession(db, w.id, now);
    expect(session).toMatchObject({ workoutId: w.id, date: '2026-10-14', finishedAt: null });
    expect(draft.items.map((i) => [i.exerciseId, i.origin, i.skipped])).toEqual([
      [a.id, 'routine', false],
      [b.id, 'routine', false],
    ]);
    expect(await getActiveSession(db)).toEqual(session);
  });

  it('allows one active session; finishing it allows the next', async () => {
    const { w } = await setup();
    const { session } = await startSession(db, w.id, T0);
    const error = await startSession(db, w.id, T0 + 1).catch((e) => e);
    expect(error).toBeInstanceOf(ActiveSessionExistsError);
    expect(error.activeSession.id).toBe(session.id);

    await finishSession(db, session.id, T0 + 5000);
    expect(await getActiveSession(db)).toBeUndefined();
    await expect(startSession(db, w.id, T0 + DAY)).resolves.toBeDefined();
  });

  it('the draft survives closing the database and keeps order, added, replaced and skipped', async () => {
    const { a, b, c, w } = await setup();
    const { session } = await startSession(db, w.id, T0);
    await saveDraft(
      db,
      session.id,
      [
        {
          exerciseId: c.id,
          origin: 'replacement',
          replacesExerciseId: a.id,
          skipped: false,
          rows: [],
        },
        { exerciseId: b.id, origin: 'routine', replacesExerciseId: null, skipped: true, rows: [] },
      ],
      T0 + 10,
    );

    db.close();
    db = new LiftDB(dbName);

    const draft = await getDraft(db, session.id);
    expect(draft?.updatedAt).toBe(T0 + 10);
    expect(draft?.items).toEqual([
      {
        exerciseId: c.id,
        origin: 'replacement',
        replacesExerciseId: a.id,
        skipped: false,
        rows: [],
      },
      { exerciseId: b.id, origin: 'routine', replacesExerciseId: null, skipped: true, rows: [] },
    ]);
    expect((await getActiveSession(db))?.id).toBe(session.id);
  });

  it('finishing removes the draft but keeps the checked sets', async () => {
    const { a, w } = await setup();
    const { session } = await startSession(db, w.id, T0);
    await addSet(db, { sessionId: session.id, exerciseId: a.id, weightGrams: 50000, reps: 10 }, T0);
    await finishSession(db, session.id, T0 + 1);
    expect(await getDraft(db, session.id)).toBeUndefined();
    expect(await listSetsForSession(db, session.id)).toHaveLength(1);
    await expect(saveDraft(db, session.id, [])).rejects.toThrow(/finished/);
  });

  it('changing a routine does not change an already started session draft or history', async () => {
    const { a, b, c, w } = await setup();
    const { session } = await startSession(db, w.id, T0);
    await setWorkoutExercises(db, w.id, [c.id]);
    expect((await getDraft(db, session.id))?.items.map((i) => i.exerciseId)).toEqual([a.id, b.id]);
  });

  it('deleteSession removes its sets and draft; other sessions are untouched', async () => {
    const { a, w } = await setup();
    const first = await startSession(db, w.id, T0);
    await addSet(
      db,
      { sessionId: first.session.id, exerciseId: a.id, weightGrams: 80000, reps: 5 },
      T0,
    );
    await finishSession(db, first.session.id, T0 + 1);
    const second = await startSession(db, w.id, T0 + DAY);
    await addSet(
      db,
      { sessionId: second.session.id, exerciseId: a.id, weightGrams: 70000, reps: 8 },
      T0 + DAY,
    );

    await deleteSession(db, second.session.id);

    expect((await listSessions(db)).map((s) => s.id)).toEqual([first.session.id]);
    expect(await getDraft(db, second.session.id)).toBeUndefined();
    const sets = await listAllSets(db);
    expect(sets).toHaveLength(1);
    expect(getPR(a.id, sets)).toMatchObject({ weightGrams: 80000 });
  });

  it('deleteDraft is a no-op for a missing draft', async () => {
    await expect(deleteDraft(db, 'nothing')).resolves.toBeUndefined();
  });

  it('prefill ignores the active session and reads the exercise last finished session', async () => {
    const { a, w } = await setup();
    const monday = await startSession(db, w.id, T0);
    await addSet(
      db,
      { sessionId: monday.session.id, exerciseId: a.id, weightGrams: 80000, reps: 5 },
      T0,
    );
    await finishSession(db, monday.session.id, T0 + 1000);

    const today = await startSession(db, w.id, T0 + DAY);
    await addSet(
      db,
      { sessionId: today.session.id, exerciseId: a.id, weightGrams: 95000, reps: 1 },
      T0 + DAY,
    );

    const prefill = prefillForExercises([a.id], await listSessions(db), await listAllSets(db));
    expect(prefill.get(a.id)).toEqual([{ weightGrams: 80000, reps: 5 }]);
  });

  it('listSessions is newest first', async () => {
    const { w } = await setup();
    const one = await startSession(db, w.id, T0);
    await finishSession(db, one.session.id, T0 + 1);
    const two = await startSession(db, w.id, T0 + DAY);
    await finishSession(db, two.session.id, T0 + DAY + 1);
    expect((await listSessions(db)).map((s) => s.id)).toEqual([two.session.id, one.session.id]);
  });
});

describe('draft plan rows (editable, unchecked until ticked)', () => {
  async function history() {
    const bench = await addExercise(db, 'Bench press');
    const incline = await addExercise(db, 'Incline press');
    const push = await createWorkout(db, 'Push', [bench.id]);
    const first = await startSession(db, push.id, T0);
    const base = { sessionId: first.session.id, exerciseId: bench.id };
    await addSet(db, { ...base, weightGrams: 80000, reps: 5 }, T0);
    await addSet(db, { ...base, weightGrams: 82500, reps: 4 }, T0 + 1);
    await finishSession(db, first.session.id, T0 + 2);
    return { bench, incline, push };
  }

  const values = (rows: { weightGrams: number | null; reps: number | null }[]) =>
    rows.map((r) => [r.weightGrams, r.reps]);

  it('startSession copies the last session of each exercise into the draft as unchecked rows', async () => {
    const { bench, push } = await history();
    const { session, draft } = await startSession(db, push.id, T0 + DAY);
    const rows = draft.items[0]!.rows;
    expect(values(rows)).toEqual([
      [80000, 5],
      [82500, 4],
    ]);
    expect(rows.every((r) => r.checkedSetId === null)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
    // Nothing was stored as a set for today.
    expect(await listSetsForSession(db, session.id)).toEqual([]);
    expect((await getDraft(db, session.id))?.items[0]?.exerciseId).toBe(bench.id);
  });

  it('an exercise without history starts with no rows', async () => {
    const { incline } = await history();
    const w = await createWorkout(db, 'New', [incline.id]);
    const { draft } = await startSession(db, w.id, T0 + DAY);
    expect(draft.items[0]!.rows).toEqual([]);
  });

  it('adding an exercise copies its own prefill, from any workout', async () => {
    const { bench, push } = await history();
    const other = await createWorkout(db, 'Legs', []);
    const prev = await startSession(db, other.id, T0 + DAY);
    await finishSession(db, prev.session.id, T0 + DAY + 1);

    const { session } = await startSession(db, push.id, T0 + 2 * DAY);
    const extra = await addExercise(db, 'Cable fly');
    const noHistory = await addExerciseToDraft(db, session.id, extra.id, T0 + 2 * DAY);
    expect(noHistory.items.at(-1)).toMatchObject({
      exerciseId: extra.id,
      origin: 'added',
      rows: [],
    });
    await expect(addExerciseToDraft(db, session.id, bench.id)).rejects.toThrow(/already/);
  });

  it('editing an unchecked row survives close and reopen and never reaches sets or PR', async () => {
    const { bench, push } = await history();
    const { session, draft } = await startSession(db, push.id, T0 + DAY);
    const row = draft.items[0]!.rows[0]!;
    const setsBefore = await listAllSets(db);

    await updateDraftRow(db, session.id, bench.id, row.id, { weightGrams: 200000, reps: 12 });

    db.close();
    db = new LiftDB(dbName);

    const reopened = await getDraft(db, session.id);
    expect(reopened?.items[0]?.rows[0]).toEqual({
      id: row.id,
      weightGrams: 200000,
      reps: 12,
      checkedSetId: null,
    });
    const setsAfter = await listAllSets(db);
    expect(setsAfter).toEqual(setsBefore);
    expect(getPR(bench.id, setsAfter)).toMatchObject({ weightGrams: 82500, reps: 4 });
  });

  it('checking creates a real set; unchecking removes it; the row keeps its values', async () => {
    const { bench, push } = await history();
    const { session, draft } = await startSession(db, push.id, T0 + DAY);
    const row = draft.items[0]!.rows[1]!;

    const set = await checkDraftRow(db, session.id, bench.id, row.id, T0 + DAY + 5);
    expect(set).toMatchObject({
      sessionId: session.id,
      exerciseId: bench.id,
      weightGrams: 82500,
      reps: 4,
      createdAt: T0 + DAY + 5,
    });
    expect((await getDraft(db, session.id))?.items[0]?.rows[1]?.checkedSetId).toBe(set.id);
    // Checking twice is idempotent.
    expect((await checkDraftRow(db, session.id, bench.id, row.id)).id).toBe(set.id);
    expect(await listSetsForSession(db, session.id)).toHaveLength(1);

    await uncheckDraftRow(db, session.id, bench.id, row.id);
    expect(await listSetsForSession(db, session.id)).toEqual([]);
    expect((await getDraft(db, session.id))?.items[0]?.rows[1]).toMatchObject({
      weightGrams: 82500,
      reps: 4,
      checkedSetId: null,
    });
  });

  it('editing a checked row updates its stored set in the same step', async () => {
    const { bench, push } = await history();
    const { session, draft } = await startSession(db, push.id, T0 + DAY);
    const row = draft.items[0]!.rows[0]!;
    const set = await checkDraftRow(db, session.id, bench.id, row.id, T0 + DAY + 1);

    await updateDraftRow(db, session.id, bench.id, row.id, { weightGrams: 85000 });

    const stored = (await listSetsForSession(db, session.id))[0]!;
    expect(stored).toMatchObject({
      id: set.id,
      weightGrams: 85000,
      reps: 5,
      createdAt: T0 + DAY + 1,
    });
    expect((await getDraft(db, session.id))?.items[0]?.rows[0]?.weightGrams).toBe(85000);
    await expect(updateDraftRow(db, session.id, bench.id, row.id, { reps: null })).rejects.toThrow(
      /checked set/,
    );
  });

  it('rejects invalid values and checking a blank row', async () => {
    const { bench, push } = await history();
    const { session, draft } = await startSession(db, push.id, T0 + DAY);
    const row = draft.items[0]!.rows[0]!;
    await expect(updateDraftRow(db, session.id, bench.id, row.id, { reps: 0 })).rejects.toThrow(
      RangeError,
    );
    await expect(
      updateDraftRow(db, session.id, bench.id, row.id, { weightGrams: -5 }),
    ).rejects.toThrow(RangeError);

    await updateDraftRow(db, session.id, bench.id, row.id, { reps: null });
    await expect(checkDraftRow(db, session.id, bench.id, row.id)).rejects.toThrow(/Fill in/);
    expect(await listSetsForSession(db, session.id)).toEqual([]);
  });

  it('unchecked rows of a finished session disappear with the draft and do not feed prefill', async () => {
    const { bench, push } = await history();
    const { session, draft } = await startSession(db, push.id, T0 + DAY);
    const row = draft.items[0]!.rows[0]!;
    await updateDraftRow(db, session.id, bench.id, row.id, { weightGrams: 99000 });
    await finishSession(db, session.id, T0 + DAY + 1);

    expect(await getDraft(db, session.id)).toBeUndefined();
    const next = await startSession(db, push.id, T0 + 2 * DAY);
    // Still the original session's sets, not the unchecked edit.
    expect(values(next.draft.items[0]!.rows)).toEqual([
      [80000, 5],
      [82500, 4],
    ]);
  });
});
