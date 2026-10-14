// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { getDraft } from '../../db/repo/drafts';
import { addExercise } from '../../db/repo/exercises';
import { addSet, listSetsForSession } from '../../db/repo/sets';
import { finishSession, startSession } from '../../db/repo/sessions';
import { createWorkout } from '../../db/repo/workouts';
import type { DraftRow, Exercise } from '../../domain/types';
import { SetRow } from './SetRow';

// jsdom has no modal <dialog>; a minimal stand-in is enough for these tests.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
};

const T0 = new Date(2026, 9, 5, 18, 0).getTime();

let exercise: Exercise;
let sessionId: string;
let row: DraftRow;

beforeEach(async () => {
  exercise = await addExercise(db, 'Bench press');
  const workout = await createWorkout(db, 'Push', [exercise.id]);
  const earlier = await startSession(db, workout.id, T0);
  await addSet(
    db,
    { sessionId: earlier.session.id, exerciseId: exercise.id, weightGrams: 80000, reps: 5 },
    T0,
  );
  await finishSession(db, earlier.session.id, T0 + 1);
  const today = await startSession(db, workout.id, T0 + 24 * 3600 * 1000);
  sessionId = today.session.id;
  row = today.draft.items[0]!.rows[0]!;
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

const storedRow = async () => (await getDraft(db, sessionId))!.items[0]!.rows[0]!;
const weight = () => screen.getByLabelText('Weight (kg)') as HTMLInputElement;
const reps = () => screen.getByLabelText('Reps') as HTMLInputElement;

function renderRow() {
  render(
    <ol>
      <SetRow sessionId={sessionId} exercise={exercise} row={row} number={1} />
    </ol>,
  );
}

describe('SetRow with the real database', () => {
  it('starts with the pre-filled values, unchecked', () => {
    renderRow();
    expect(weight().value).toBe('80');
    expect(reps().value).toBe('5');
    const check = screen.getByLabelText('Mark set as done') as HTMLButtonElement;
    expect(check.disabled).toBe(false);
    expect(check.getAttribute('aria-pressed')).toBe('false');
  });

  it('writes every valid keystroke to the draft, before any blur', async () => {
    renderRow();
    fireEvent.change(weight(), { target: { value: '8' } });
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(8000));
    fireEvent.change(weight(), { target: { value: '82' } });
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(82000));
    fireEvent.change(weight(), { target: { value: '82,5' } });
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(82500));
    // No blur happened, yet the value is in the database.
    expect(document.activeElement).not.toBe(weight());
  });

  it('keeps the last valid value in the draft when the text becomes invalid', async () => {
    renderRow();
    fireEvent.change(weight(), { target: { value: '82' } });
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(82000));
    fireEvent.change(weight(), { target: { value: '82x' } });
    fireEvent.change(weight(), { target: { value: '' } });
    fireEvent.change(weight(), { target: { value: '9999999' } });
    // Give any (wrongly) scheduled write time to land before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect((await storedRow()).weightGrams).toBe(82000);
  });

  it('saves reps typed and tapped, and none of it creates a stored set until checked', async () => {
    renderRow();
    fireEvent.change(reps(), { target: { value: '1' } });
    fireEvent.change(reps(), { target: { value: '10' } });
    await waitFor(async () => expect((await storedRow()).reps).toBe(10));
    expect(await listSetsForSession(db, sessionId)).toEqual([]);
  });

  it('check creates the stored set with the edited values; editing it updates the set', async () => {
    renderRow();
    fireEvent.change(weight(), { target: { value: '85' } });
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(85000));

    fireEvent.click(screen.getByLabelText('Mark set as done'));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toHaveLength(1));
    const [set] = await listSetsForSession(db, sessionId);
    expect(set).toMatchObject({ weightGrams: 85000, reps: 5, exerciseId: exercise.id });
    expect((await storedRow()).checkedSetId).toBe(set!.id);

    // Re-render with the new draft row, as the live query would, then edit the checked set.
    row = await storedRow();
    cleanup();
    renderRow();
    expect(weight().value).toBe('85');
    fireEvent.change(weight(), { target: { value: '86' } });
    await waitFor(async () => {
      const [updated] = await listSetsForSession(db, sessionId);
      expect(updated?.weightGrams).toBe(86000);
    });

    // Uncheck: the stored set goes away, the row keeps its values.
    fireEvent.click(screen.getByLabelText('Mark set as not done'));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toEqual([]));
    expect((await storedRow()).weightGrams).toBe(86000);
  });

  it('removing an unchecked row deletes it from the draft at once', async () => {
    renderRow();
    fireEvent.click(screen.getByLabelText('Remove set 1'));
    await waitFor(async () => expect((await getDraft(db, sessionId))!.items[0]!.rows).toEqual([]));
  });

  it('removing a checked row asks first, then deletes the row and its stored set', async () => {
    renderRow();
    fireEvent.click(screen.getByLabelText('Mark set as done'));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toHaveLength(1));
    row = await storedRow();
    cleanup();
    renderRow();

    fireEvent.click(screen.getByLabelText('Remove set 1'));
    // Nothing is deleted until the question is answered.
    expect(await listSetsForSession(db, sessionId)).toHaveLength(1);
    fireEvent.click(screen.getByText('Remove', { selector: 'dialog button' }));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toEqual([]));
    expect((await getDraft(db, sessionId))!.items[0]!.rows).toEqual([]);
  });
});
