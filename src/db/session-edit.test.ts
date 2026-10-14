import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPR } from '../domain/pr';
import type { Exercise, SessionDraft, Workout } from '../domain/types';
import {
  addExerciseToDraft,
  checkDraftRow,
  getDraft,
  ItemHasCheckedSetsError,
  moveDraftItem,
  replaceDraftExercise,
  skipDraftItem,
  unskipDraftItem,
  updateDraftRow,
} from './repo/drafts';
import { addExercise, setExerciseArchived } from './repo/exercises';
import { finishSession, getSessionSummary, startSession } from './repo/sessions';
import { addSet, listAllSets, listSetsForSession } from './repo/sets';
import { createWorkout, getWorkout } from './repo/workouts';
import { LiftDB } from './schema';

let db: LiftDB;
let n = 0;

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 5, 18, 0).getTime();

interface World {
  bench: Exercise;
  incline: Exercise;
  fly: Exercise;
  squat: Exercise;
  curl: Exercise;
  push: Workout;
}

beforeEach(() => {
  db = new LiftDB(`lift-edit-test-${++n}`);
});

afterEach(async () => {
  await db.delete();
});

/**
 * Exercises with some history: bench (80x5, 82.5x4) and incline (30x10) were done last week in
 * other workouts; the routine "Push" is [bench, fly]. Nothing is active yet.
 */
async function world(): Promise<World> {
  const bench = await addExercise(db, 'Bench press');
  const incline = await addExercise(db, 'Incline dumbbell press');
  const fly = await addExercise(db, 'Cable fly');
  const squat = await addExercise(db, 'Squat');
  const curl = await addExercise(db, 'Curl');
  const old = await createWorkout(db, 'Old', [bench.id, incline.id]);
  const prev = await startSession(db, old.id, T0 - 7 * DAY);
  const base = { sessionId: prev.session.id };
  await addSet(db, { ...base, exerciseId: bench.id, weightGrams: 80000, reps: 5 }, T0 - 7 * DAY);
  await addSet(
    db,
    { ...base, exerciseId: bench.id, weightGrams: 82500, reps: 4 },
    T0 - 7 * DAY + 1,
  );
  await addSet(
    db,
    { ...base, exerciseId: incline.id, weightGrams: 30000, reps: 10 },
    T0 - 7 * DAY + 2,
  );
  await finishSession(db, prev.session.id, T0 - 7 * DAY + 3);
  const push = await createWorkout(db, 'Push', [bench.id, fly.id]);
  return { bench, incline, fly, squat, curl, push };
}

async function begin(w: World) {
  const { session, draft } = await startSession(db, w.push.id, T0);
  return { sessionId: session.id, draft };
}

const order = (draft: SessionDraft | undefined) => draft!.items.map((i) => i.exerciseId);
const rowsOf = (draft: SessionDraft | undefined, exerciseId: string) =>
  draft!.items.find((i) => i.exerciseId === exerciseId)!.rows;
const values = (rows: { weightGrams: number | null; reps: number | null }[]) =>
  rows.map((r) => [r.weightGrams, r.reps]);

async function checkAll(sessionId: string, exerciseId: string, rowIds: string[]) {
  let at = T0 + 1000;
  for (const id of rowIds) await checkDraftRow(db, sessionId, exerciseId, id, (at += 1000));
}

describe('adding an exercise', () => {
  it('appends it with its own history, from any workout', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    const draft = await addExerciseToDraft(db, sessionId, w.incline.id, T0 + 5);
    expect(order(draft)).toEqual([w.bench.id, w.fly.id, w.incline.id]);
    const added = draft.items[2]!;
    expect(added).toMatchObject({ origin: 'added', replacesExerciseId: null, skipped: false });
    expect(values(added.rows)).toEqual([[30000, 10]]);
    expect(added.rows.every((r) => r.checkedSetId === null)).toBe(true);
  });

  it('an exercise without history starts with no rows', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    const draft = await addExerciseToDraft(db, sessionId, w.curl.id);
    expect(rowsOf(draft, w.curl.id)).toEqual([]);
  });

  it('does not add an archived exercise, an unknown one, or one already in the session', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    await setExerciseArchived(db, w.curl.id, true);
    await expect(addExerciseToDraft(db, sessionId, w.curl.id)).rejects.toThrow(/archived/);
    await expect(addExerciseToDraft(db, sessionId, 'ghost')).rejects.toThrow(/not found/);
    await expect(addExerciseToDraft(db, sessionId, w.bench.id)).rejects.toThrow(/already/);

    // Also not when it was skipped: it is still in the session, so bring it back instead.
    await skipDraftItem(db, sessionId, w.fly.id);
    await expect(addExerciseToDraft(db, sessionId, w.fly.id)).rejects.toThrow(/already/);
  });

  it('is only for today: the routine does not change', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    await addExerciseToDraft(db, sessionId, w.incline.id);
    expect((await getWorkout(db, w.push.id))?.exerciseIds).toEqual([w.bench.id, w.fly.id]);
  });
});

describe('reordering', () => {
  it('moves an exercise up and down and keeps the rows and checked sets', async () => {
    const w = await world();
    const { sessionId, draft } = await begin(w);
    await checkAll(sessionId, w.bench.id, [draft.items[0]!.rows[0]!.id]);

    await moveDraftItem(db, sessionId, w.bench.id, 1, T0 + 10);
    let current = await getDraft(db, sessionId);
    expect(order(current)).toEqual([w.fly.id, w.bench.id]);
    expect(rowsOf(current, w.bench.id)[0]!.checkedSetId).not.toBeNull();
    expect(await listSetsForSession(db, sessionId)).toHaveLength(1);

    await moveDraftItem(db, sessionId, w.bench.id, -1);
    current = await getDraft(db, sessionId);
    expect(order(current)).toEqual([w.bench.id, w.fly.id]);
  });

  it('does nothing at the ends and never touches the routine', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    await moveDraftItem(db, sessionId, w.bench.id, -1);
    await moveDraftItem(db, sessionId, w.fly.id, 1);
    expect(order(await getDraft(db, sessionId))).toEqual([w.bench.id, w.fly.id]);
    await moveDraftItem(db, sessionId, w.bench.id, 1);
    expect((await getWorkout(db, w.push.id))?.exerciseIds).toEqual([w.bench.id, w.fly.id]);
  });

  it('skips over skipped exercises and they keep their place', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    await addExerciseToDraft(db, sessionId, w.incline.id);
    await skipDraftItem(db, sessionId, w.fly.id);
    await moveDraftItem(db, sessionId, w.incline.id, -1);
    expect(order(await getDraft(db, sessionId))).toEqual([w.incline.id, w.fly.id, w.bench.id]);
    await unskipDraftItem(db, sessionId, w.fly.id);
    expect(order(await getDraft(db, sessionId))).toEqual([w.incline.id, w.fly.id, w.bench.id]);
  });
});

describe('skipping and bringing back', () => {
  it('skips an exercise with no checked sets at once and keeps its values', async () => {
    const w = await world();
    const { sessionId, draft } = await begin(w);
    const row = draft.items[0]!.rows[0]!;
    await updateDraftRow(db, sessionId, w.bench.id, row.id, { weightGrams: 90000 });

    await skipDraftItem(db, sessionId, w.bench.id);
    let current = await getDraft(db, sessionId);
    expect(current!.items[0]).toMatchObject({ exerciseId: w.bench.id, skipped: true });

    await unskipDraftItem(db, sessionId, w.bench.id);
    current = await getDraft(db, sessionId);
    expect(current!.items[0]!.skipped).toBe(false);
    expect(rowsOf(current, w.bench.id)[0]).toMatchObject({ id: row.id, weightGrams: 90000 });
  });

  it('with checked sets it refuses unless told to remove them, and changes nothing', async () => {
    const w = await world();
    const { sessionId, draft } = await begin(w);
    await checkAll(
      sessionId,
      w.bench.id,
      draft.items[0]!.rows.map((r) => r.id),
    );

    const error = await skipDraftItem(db, sessionId, w.bench.id).catch((e) => e);
    expect(error).toBeInstanceOf(ItemHasCheckedSetsError);
    expect(error.checkedSets).toBe(2);
    expect(await listSetsForSession(db, sessionId)).toHaveLength(2);
    expect((await getDraft(db, sessionId))!.items[0]!.skipped).toBe(false);
  });

  it('with removeCheckedSets it deletes the stored sets; bringing back restores unchecked rows', async () => {
    const w = await world();
    const { sessionId, draft } = await begin(w);
    const rows = draft.items[0]!.rows;
    await checkAll(
      sessionId,
      w.bench.id,
      rows.map((r) => r.id),
    );
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({ weightGrams: 82500 });

    await skipDraftItem(db, sessionId, w.bench.id, { removeCheckedSets: true });
    expect(await listSetsForSession(db, sessionId)).toEqual([]);
    // The PR comes from stored sets only: today's checked sets are gone, last week's remain.
    const todays = (await listAllSets(db)).filter((s) => s.sessionId === sessionId);
    expect(todays).toEqual([]);

    await unskipDraftItem(db, sessionId, w.bench.id);
    const back = rowsOf(await getDraft(db, sessionId), w.bench.id);
    expect(values(back)).toEqual([
      [80000, 5],
      [82500, 4],
    ]);
    expect(back.every((r) => r.checkedSetId === null)).toBe(true);
  });

  it('a skipped exercise does not count in the finish summary', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    expect(await getSessionSummary(db, sessionId)).toMatchObject({
      exercises: 2,
      uncheckedRows: 2,
    });
    await skipDraftItem(db, sessionId, w.bench.id);
    expect(await getSessionSummary(db, sessionId)).toEqual({
      exercises: 1,
      checkedSets: 0,
      uncheckedRows: 0,
    });
  });
});

describe('replacing an exercise', () => {
  it('only today: same place, rows from the new exercise own history, routine unchanged', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    const draft = await replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id, {}, T0 + 9);

    expect(order(draft)).toEqual([w.incline.id, w.fly.id]);
    expect(draft.items[0]).toMatchObject({
      origin: 'replacement',
      replacesExerciseId: w.bench.id,
      skipped: false,
    });
    // Incline's own last session, not bench's values.
    expect(values(draft.items[0]!.rows)).toEqual([[30000, 10]]);
    expect((await getWorkout(db, w.push.id))?.exerciseIds).toEqual([w.bench.id, w.fly.id]);
    expect(order(await getDraft(db, sessionId))).toEqual([w.incline.id, w.fly.id]);
  });

  it('with 2 sets already checked: the old exercise keeps them, the new one follows', async () => {
    const w = await world();
    const { sessionId, draft } = await begin(w);
    const [first, second] = draft.items[0]!.rows;
    await addExerciseToDraft(db, sessionId, w.squat.id);
    // A third and fourth planned row that are not done.
    await updateDraftRow(db, sessionId, w.bench.id, second!.id, { weightGrams: 82500 });
    await checkAll(sessionId, w.bench.id, [first!.id, second!.id]);

    const next = await replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id);

    expect(order(next)).toEqual([w.bench.id, w.incline.id, w.fly.id, w.squat.id]);
    expect(next.items[0]!.rows).toHaveLength(2);
    expect(next.items[0]!.rows.every((r) => r.checkedSetId !== null)).toBe(true);
    expect(next.items[1]).toMatchObject({ origin: 'replacement', replacesExerciseId: w.bench.id });

    // The two done sets are still stored, on the exercise that was performed.
    const stored = await listSetsForSession(db, sessionId);
    expect(stored).toHaveLength(2);
    expect(stored.every((s) => s.exerciseId === w.bench.id)).toBe(true);
    expect(getPR(w.bench.id, await listAllSets(db))).toMatchObject({ weightGrams: 82500 });
  });

  it('after finishing, history stays with the exercise actually performed', async () => {
    const w = await world();
    const { sessionId, draft } = await begin(w);
    await checkAll(sessionId, w.bench.id, [draft.items[0]!.rows[0]!.id]);
    const next = await replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id);
    await checkAll(sessionId, w.incline.id, [next.items[1]!.rows[0]!.id]);
    await finishSession(db, sessionId, T0 + 99_000);

    const sets = await listAllSets(db);
    const today = sets.filter((s) => s.sessionId === sessionId);
    expect(today.map((s) => s.exerciseId).sort()).toEqual([w.bench.id, w.incline.id].sort());
    // Next time, each exercise pre-fills from what was done on it.
    const again = await startSession(db, w.push.id, T0 + DAY);
    expect(values(again.draft.items[0]!.rows)).toEqual([[80000, 5]]);
  });

  it('a chain keeps pointing at the routine exercise it replaced', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    await replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id);
    const draft = await replaceDraftExercise(db, sessionId, w.incline.id, w.squat.id);
    expect(draft.items[0]).toMatchObject({
      exerciseId: w.squat.id,
      origin: 'replacement',
      replacesExerciseId: w.bench.id,
    });
  });

  describe('update the workout', () => {
    it('swaps the exercise in the routine at the same position', async () => {
      const w = await world();
      const { sessionId } = await begin(w);
      await replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id, { updateWorkout: true });
      expect((await getWorkout(db, w.push.id))?.exerciseIds).toEqual([w.incline.id, w.fly.id]);
    });

    it('works after a chain: the routine exercise is the original one', async () => {
      const w = await world();
      const { sessionId } = await begin(w);
      await replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id);
      await replaceDraftExercise(db, sessionId, w.incline.id, w.squat.id, { updateWorkout: true });
      expect((await getWorkout(db, w.push.id))?.exerciseIds).toEqual([w.squat.id, w.fly.id]);
    });

    it('the next session of that routine uses the new exercise (and the old one stays in history)', async () => {
      const w = await world();
      const first = await begin(w);
      await replaceDraftExercise(db, first.sessionId, w.bench.id, w.incline.id, {
        updateWorkout: true,
      });
      await finishSession(db, first.sessionId, T0 + 1000);
      const second = await startSession(db, w.push.id, T0 + DAY);
      expect(second.draft.items.map((i) => i.exerciseId)).toEqual([w.incline.id, w.fly.id]);
      expect(second.draft.items[0]!.origin).toBe('routine');
      expect(await listAllSets(db)).toHaveLength(3); // last week's sets are all still there
    });

    it('is refused, and nothing changes, if the new exercise is already in the routine', async () => {
      const w = await world();
      // Squat is in the routine but left out of this session because it was archived at the start.
      await db.workouts.update(w.push.id, { exerciseIds: [w.bench.id, w.fly.id, w.squat.id] });
      await setExerciseArchived(db, w.squat.id, true);
      const { sessionId } = await begin(w);
      await setExerciseArchived(db, w.squat.id, false);
      const before = await getDraft(db, sessionId);
      expect(order(before)).toEqual([w.bench.id, w.fly.id]);

      await expect(
        replaceDraftExercise(db, sessionId, w.bench.id, w.squat.id, { updateWorkout: true }),
      ).rejects.toThrow(/already in the workout/);
      expect(await getDraft(db, sessionId)).toEqual(before);
      expect((await getWorkout(db, w.push.id))?.exerciseIds).toEqual([
        w.bench.id,
        w.fly.id,
        w.squat.id,
      ]);

      // Only today is still possible.
      const draft = await replaceDraftExercise(db, sessionId, w.bench.id, w.squat.id);
      expect(order(draft)).toEqual([w.squat.id, w.fly.id]);
    });

    it('is refused for an exercise that was added today', async () => {
      const w = await world();
      const { sessionId } = await begin(w);
      await addExerciseToDraft(db, sessionId, w.curl.id);
      const before = await getDraft(db, sessionId);
      await expect(
        replaceDraftExercise(db, sessionId, w.curl.id, w.squat.id, { updateWorkout: true }),
      ).rejects.toThrow(/no exercise to replace/);
      expect(await getDraft(db, sessionId)).toEqual(before);
      // Only today still works for it.
      const draft = await replaceDraftExercise(db, sessionId, w.curl.id, w.squat.id);
      expect(order(draft)).toContain(w.squat.id);
    });

    it('is refused when the routine no longer has that exercise', async () => {
      const w = await world();
      const { sessionId } = await begin(w);
      await db.workouts.update(w.push.id, { exerciseIds: [w.fly.id] });
      await expect(
        replaceDraftExercise(db, sessionId, w.bench.id, w.incline.id, { updateWorkout: true }),
      ).rejects.toThrow(/no exercise to replace/);
      expect(order(await getDraft(db, sessionId))).toEqual([w.bench.id, w.fly.id]);
    });
  });

  it('refuses the same exercise, an exercise already in the session, archived and unknown ones', async () => {
    const w = await world();
    const { sessionId } = await begin(w);
    const before = await getDraft(db, sessionId);
    await expect(replaceDraftExercise(db, sessionId, w.bench.id, w.bench.id)).rejects.toThrow();
    await expect(replaceDraftExercise(db, sessionId, w.bench.id, w.fly.id)).rejects.toThrow(
      /already in this session/,
    );
    await setExerciseArchived(db, w.curl.id, true);
    await expect(replaceDraftExercise(db, sessionId, w.bench.id, w.curl.id)).rejects.toThrow(
      /archived/,
    );
    await expect(replaceDraftExercise(db, sessionId, w.bench.id, 'ghost')).rejects.toThrow(
      /not found/,
    );
    await expect(replaceDraftExercise(db, sessionId, 'ghost', w.squat.id)).rejects.toThrow(
      /not in this session/,
    );
    expect(await getDraft(db, sessionId)).toEqual(before);
  });
});
