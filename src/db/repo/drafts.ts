import { newId } from '../../domain/id';
import { prefillForExercises } from '../../domain/prefill';
import { applyReplacement, moveVisibleTo, routineTargetOf } from '../../domain/session-items';
import { assertValidPartialSetValues, assertValidSetValues } from '../../domain/set-values';
import type { DraftItem, DraftRow, SessionDraft, SessionSet } from '../../domain/types';
import type { LiftDB } from '../schema';
import { addSet, updateSetValues } from './sets';

export function getDraft(db: LiftDB, sessionId: string): Promise<SessionDraft | undefined> {
  return db.drafts.get(sessionId);
}

/**
 * Plan rows for exercises, copied from each exercise's last finished session (any workout).
 * The rows are unchecked: they are suggestions the user can edit, not stored sets.
 * Callers must run inside a transaction that includes sessions and sets.
 */
export async function buildPlanRows(
  db: LiftDB,
  exerciseIds: readonly string[],
): Promise<Map<string, DraftRow[]>> {
  const sessions = await db.sessions.toArray();
  const sets = await db.sets
    .where('exerciseId')
    .anyOf([...exerciseIds])
    .toArray();
  const prefill = prefillForExercises(exerciseIds, sessions, sets);
  const rows = new Map<string, DraftRow[]>();
  for (const exerciseId of exerciseIds) {
    rows.set(
      exerciseId,
      (prefill.get(exerciseId) ?? []).map(({ weightGrams, reps }) => ({
        id: newId(),
        weightGrams,
        reps,
        checkedSetId: null,
      })),
    );
  }
  return rows;
}

function cloneItem(item: DraftItem): DraftItem {
  return { ...item, rows: item.rows.map((row) => ({ ...row })) };
}

async function loadActiveDraft(db: LiftDB, sessionId: string): Promise<SessionDraft> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (session.finishedAt !== null) throw new Error('Session is already finished');
  const draft = await db.drafts.get(sessionId);
  if (!draft) throw new Error(`Draft for session ${sessionId} not found`);
  return draft;
}

function findRow(draft: SessionDraft, exerciseId: string, rowId: string) {
  const item = draft.items.find((i) => i.exerciseId === exerciseId);
  const row = item?.rows.find((r) => r.id === rowId);
  if (!item || !row) throw new Error(`Row ${rowId} not found in the session draft`);
  return { item, row };
}

/** Saves the working state of an active session (order, added/replaced/skipped, plan rows). */
export async function saveDraft(
  db: LiftDB,
  sessionId: string,
  items: readonly DraftItem[],
  now: number = Date.now(),
): Promise<SessionDraft> {
  return db.transaction('rw', db.drafts, db.sessions, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.finishedAt !== null) throw new Error('Session is already finished');
    const draft: SessionDraft = { sessionId, items: items.map(cloneItem), updatedAt: now };
    await db.drafts.put(draft);
    return draft;
  });
}

export function deleteDraft(db: LiftDB, sessionId: string): Promise<void> {
  return db.drafts.delete(sessionId);
}

/** Appends an exercise to the active session, with its prefill copied in as the plan. */
export async function addExerciseToDraft(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  now: number = Date.now(),
): Promise<SessionDraft> {
  return db.transaction('rw', db.drafts, db.sessions, db.sets, db.exercises, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);
    if (exercise.archived) throw new Error('An archived exercise cannot be added');
    if (draft.items.some((i) => i.exerciseId === exerciseId)) {
      throw new Error('Exercise is already in this session');
    }
    const rows = (await buildPlanRows(db, [exerciseId])).get(exerciseId) ?? [];
    const next: SessionDraft = {
      ...draft,
      items: [
        ...draft.items,
        { exerciseId, origin: 'added', replacesExerciseId: null, skipped: false, rows },
      ],
      updatedAt: now,
    };
    await db.drafts.put(next);
    return next;
  });
}

/**
 * Edits a plan row. An unchecked row only changes in the draft. A checked row also updates its
 * stored set, in the same transaction.
 */
export async function updateDraftRow(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  rowId: string,
  changes: { weightGrams?: number | null; reps?: number | null },
  now: number = Date.now(),
): Promise<DraftRow> {
  return db.transaction('rw', db.drafts, db.sessions, db.sets, db.exercises, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const { row } = findRow(draft, exerciseId, rowId);
    const weightGrams = changes.weightGrams === undefined ? row.weightGrams : changes.weightGrams;
    const reps = changes.reps === undefined ? row.reps : changes.reps;
    assertValidPartialSetValues(weightGrams, reps);

    if (row.checkedSetId !== null) {
      if (weightGrams === null || reps === null) {
        throw new Error('A checked set must keep both weight and reps');
      }
      await updateSetValues(db, row.checkedSetId, { weightGrams, reps });
    }
    row.weightGrams = weightGrams;
    row.reps = reps;
    draft.updatedAt = now;
    await db.drafts.put(draft);
    return { ...row };
  });
}

/** Checking a row creates the real set. Checking an already checked row does nothing. */
export async function checkDraftRow(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  rowId: string,
  now: number = Date.now(),
): Promise<SessionSet> {
  return db.transaction('rw', db.drafts, db.sessions, db.sets, db.exercises, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const { item, row } = findRow(draft, exerciseId, rowId);
    if (row.checkedSetId !== null) {
      const existing = await db.sets.get(row.checkedSetId);
      if (existing) return existing;
    }
    if (row.weightGrams === null || row.reps === null) {
      throw new Error('Fill in weight and reps before checking the set');
    }
    assertValidSetValues(row.weightGrams, row.reps);
    const set = await addSet(
      db,
      {
        sessionId,
        exerciseId,
        weightGrams: row.weightGrams,
        reps: row.reps,
        // The row's position, so later pre-filling lists the sets in the order they were planned.
        order: item.rows.indexOf(row),
      },
      now,
    );
    row.checkedSetId = set.id;
    draft.updatedAt = now;
    await db.drafts.put(draft);
    return set;
  });
}

/** Unchecking removes the stored set; the row stays in the plan with its values. */
export async function uncheckDraftRow(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  rowId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.drafts, db.sessions, db.sets, db.exercises, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const { row } = findRow(draft, exerciseId, rowId);
    if (row.checkedSetId === null) return;
    await db.sets.delete(row.checkedSetId);
    row.checkedSetId = null;
    draft.updatedAt = now;
    await db.drafts.put(draft);
  });
}

/**
 * Appends a row to an exercise's plan. It copies the weight and reps of the exercise's last row
 * (a repeated set is the common case); with no rows yet it starts blank.
 */
export async function addDraftRow(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  now: number = Date.now(),
): Promise<DraftRow> {
  return db.transaction('rw', db.drafts, db.sessions, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const item = draft.items.find((i) => i.exerciseId === exerciseId);
    if (!item) throw new Error(`Exercise ${exerciseId} is not in this session`);
    const previous = item.rows.at(-1);
    const row: DraftRow = {
      id: newId(),
      weightGrams: previous?.weightGrams ?? null,
      reps: previous?.reps ?? null,
      checkedSetId: null,
    };
    item.rows.push(row);
    draft.updatedAt = now;
    await db.drafts.put(draft);
    return { ...row };
  });
}

/** Removes a plan row. If the row was checked, its stored set is deleted too. */
export async function removeDraftRow(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  rowId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.drafts, db.sessions, db.sets, db.exercises, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const { item, row } = findRow(draft, exerciseId, rowId);
    if (row.checkedSetId !== null) await db.sets.delete(row.checkedSetId);
    item.rows = item.rows.filter((r) => r.id !== rowId);
    draft.updatedAt = now;
    await db.drafts.put(draft);
  });
}

/** Thrown when skipping or replacing needs the user to confirm that checked sets go away. */
export class ItemHasCheckedSetsError extends Error {
  constructor(public readonly checkedSets: number) {
    super(`The exercise has ${checkedSets} checked set(s)`);
    this.name = 'ItemHasCheckedSetsError';
  }
}

/** Moves an exercise to a position among the visible ones (drag and drop). Today only. */
export async function moveDraftItemTo(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  toIndex: number,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.drafts, db.sessions, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    if (!draft.items.some((i) => i.exerciseId === exerciseId)) {
      throw new Error(`Exercise ${exerciseId} is not in this session`);
    }
    await db.drafts.put({
      ...draft,
      items: moveVisibleTo(draft.items, exerciseId, toIndex),
      updatedAt: now,
    });
  });
}

/**
 * Leaves an exercise out of this workout. Its rows are kept (unchecked) so that "bring back"
 * restores them. If some of its sets are checked, `removeCheckedSets` must be true: those stored
 * sets are deleted, otherwise `ItemHasCheckedSetsError` is thrown and nothing changes.
 */
export async function skipDraftItem(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  options: { removeCheckedSets?: boolean } = {},
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.drafts, db.sessions, db.sets, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const item = draft.items.find((i) => i.exerciseId === exerciseId);
    if (!item) throw new Error(`Exercise ${exerciseId} is not in this session`);
    const checked = item.rows.filter((r) => r.checkedSetId !== null);
    if (checked.length > 0 && !options.removeCheckedSets) {
      throw new ItemHasCheckedSetsError(checked.length);
    }
    for (const row of checked) {
      await db.sets.delete(row.checkedSetId!);
      row.checkedSetId = null;
    }
    item.skipped = true;
    draft.updatedAt = now;
    await db.drafts.put(draft);
  });
}

/** Brings a skipped exercise back, with its rows as they were (unchecked). */
export async function unskipDraftItem(
  db: LiftDB,
  sessionId: string,
  exerciseId: string,
  now: number = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.drafts, db.sessions, async () => {
    const draft = await loadActiveDraft(db, sessionId);
    const item = draft.items.find((i) => i.exerciseId === exerciseId);
    if (!item) throw new Error(`Exercise ${exerciseId} is not in this session`);
    item.skipped = false;
    draft.updatedAt = now;
    await db.drafts.put(draft);
  });
}

/**
 * Replaces an exercise of the session by another one (see `applyReplacement`). The new
 * exercise's rows come from its own history. With `updateWorkout` the routine is changed too:
 * the exercise it stands for is swapped in place. That needs the item to come from the routine
 * and the new exercise not to be in it already, otherwise it throws and nothing changes.
 */
export async function replaceDraftExercise(
  db: LiftDB,
  sessionId: string,
  oldExerciseId: string,
  newExerciseId: string,
  options: { updateWorkout?: boolean } = {},
  now: number = Date.now(),
): Promise<SessionDraft> {
  return db.transaction(
    'rw',
    [db.drafts, db.sessions, db.sets, db.exercises, db.workouts],
    async () => {
      const draft = await loadActiveDraft(db, sessionId);
      if (oldExerciseId === newExerciseId) throw new Error('Choose a different exercise');
      const old = draft.items.find((i) => i.exerciseId === oldExerciseId);
      if (!old) throw new Error(`Exercise ${oldExerciseId} is not in this session`);
      const exercise = await db.exercises.get(newExerciseId);
      if (!exercise) throw new Error(`Exercise ${newExerciseId} not found`);
      if (exercise.archived) throw new Error('An archived exercise cannot be used');
      if (draft.items.some((i) => i.exerciseId === newExerciseId)) {
        throw new Error('Exercise is already in this session');
      }

      if (options.updateWorkout) {
        const session = (await db.sessions.get(sessionId))!;
        const workout = await db.workouts.get(session.workoutId);
        const target = routineTargetOf(old);
        if (!workout || target === null || !workout.exerciseIds.includes(target)) {
          throw new Error('The workout has no exercise to replace');
        }
        if (workout.exerciseIds.includes(newExerciseId)) {
          throw new Error('The exercise is already in the workout');
        }
        await db.workouts.update(workout.id, {
          exerciseIds: workout.exerciseIds.map((id) => (id === target ? newExerciseId : id)),
        });
      }

      const rows = (await buildPlanRows(db, [newExerciseId])).get(newExerciseId) ?? [];
      const next: SessionDraft = {
        ...draft,
        items: applyReplacement(draft.items, oldExerciseId, newExerciseId, rows),
        updatedAt: now,
      };
      await db.drafts.put(next);
      return next;
    },
  );
}
