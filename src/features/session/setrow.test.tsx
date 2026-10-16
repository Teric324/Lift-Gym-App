// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { getDraft } from '../../db/repo/drafts';
import { addExercise } from '../../db/repo/exercises';
import { addSet, listSetsForSession } from '../../db/repo/sets';
import { finishSession, startSession } from '../../db/repo/sessions';
import { createWorkout } from '../../db/repo/workouts';
import type { DraftRow, Exercise } from '../../domain/types';
import { SetRow } from './SetRow';

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
const weightButton = () => screen.getByRole('button', { name: 'Weight (kg)' });
const weightText = () => weightButton().textContent?.replace(/\s+/g, ' ').trim();
/** Types into the picker's field, opening the picker first if it is closed. */
function typeWeight(text: string) {
  if (!document.querySelector('dialog[open]')) fireEvent.click(weightButton());
  fireEvent.change(screen.getByLabelText('Type a weight (kg)'), { target: { value: text } });
}
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
    expect(weightText()).toBe('80 kg');
    expect(reps().value).toBe('5');
    const check = screen.getByLabelText('Mark set as done') as HTMLButtonElement;
    expect(check.disabled).toBe(false);
    expect(check.getAttribute('aria-pressed')).toBe('false');
  });

  it('writes every valid keystroke to the draft, before any blur', async () => {
    renderRow();
    typeWeight('8');
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(8000));
    typeWeight('82');
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(82000));
    typeWeight('82,5');
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(82500));
    // The picker is still open and nothing was confirmed, yet the value is in the database.
    expect(document.querySelector('dialog[open]')).toBeTruthy();
  });

  it('keeps the last valid value in the draft when the text becomes invalid', async () => {
    renderRow();
    typeWeight('82');
    await waitFor(async () => expect((await storedRow()).weightGrams).toBe(82000));
    typeWeight('82x');
    typeWeight('');
    typeWeight('9999999');
    // Give any (wrongly) scheduled write time to land before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect((await storedRow()).weightGrams).toBe(82000);
  });

  it('saves reps as they are typed, and none of it creates a stored set until checked', async () => {
    renderRow();
    fireEvent.change(reps(), { target: { value: '1' } });
    fireEvent.change(reps(), { target: { value: '10' } });
    await waitFor(async () => expect((await storedRow()).reps).toBe(10));
    fireEvent.change(reps(), { target: { value: '100' } });
    await waitFor(async () => expect((await storedRow()).reps).toBe(100));
    expect(await listSetsForSession(db, sessionId)).toEqual([]);
  });

  it('check creates the stored set with the edited values; editing it updates the set', async () => {
    renderRow();
    typeWeight('85');
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
    expect(weightText()).toBe('85 kg');
    typeWeight('86');
    await waitFor(async () => {
      const [updated] = await listSetsForSession(db, sessionId);
      expect(updated?.weightGrams).toBe(86000);
    });

    // Uncheck: the stored set goes away, the row keeps its values.
    fireEvent.click(screen.getByLabelText('Mark set as not done'));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toEqual([]));
    expect((await storedRow()).weightGrams).toBe(86000);
  });

  it('Delete on an unchecked row deletes it from the draft at once', async () => {
    renderRow();
    fireEvent.click(screen.getByLabelText('Delete set 1'));
    await waitFor(async () => expect((await getDraft(db, sessionId))!.items[0]!.rows).toEqual([]));
  });

  it('Delete on a checked row asks first, then deletes the row and its stored set', async () => {
    renderRow();
    fireEvent.click(screen.getByLabelText('Mark set as done'));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toHaveLength(1));
    row = await storedRow();
    cleanup();
    renderRow();

    fireEvent.click(screen.getByLabelText('Delete set 1'));
    // Nothing is deleted until the question is answered.
    expect(await listSetsForSession(db, sessionId)).toHaveLength(1);
    fireEvent.click(screen.getByText('Remove', { selector: 'dialog button' }));
    await waitFor(async () => expect(await listSetsForSession(db, sessionId)).toEqual([]));
    expect((await getDraft(db, sessionId))!.items[0]!.rows).toEqual([]);
  });
});

describe('SetRow: swipe left to delete', () => {
  const li = () => document.querySelector('li.set-swipe') as HTMLElement;
  const content = () => document.querySelector('.set-row') as HTMLElement;
  const isOpen = () => li().classList.contains('set-swipe--open');
  const touch = (id = 1) => ({ pointerId: id, pointerType: 'touch' });
  const down = (x: number, y: number, target: Element = content()) =>
    fireEvent.pointerDown(target, { clientX: x, clientY: y, ...touch() });
  const move = (x: number, y: number) =>
    fireEvent.pointerMove(li(), { clientX: x, clientY: y, ...touch() });
  const up = (x: number, y: number) =>
    fireEvent.pointerUp(li(), { clientX: x, clientY: y, ...touch() });
  function swipe(dx: number) {
    down(300, 100);
    move(300 + dx / 2, 101);
    move(300 + dx, 101);
    up(300 + dx, 101);
  }

  it('opens after a swipe of 60 px or more, the row sliding by the button width', () => {
    renderRow();
    expect(isOpen()).toBe(false);
    swipe(-70);
    expect(isOpen()).toBe(true);
    expect(content().classList.contains('set-row--shifted')).toBe(true);
    expect(content().style.getPropertyValue('--swipe-x')).toBe('-80px');
    // The red button is in the row and tapping it deletes the set.
    expect(screen.getByText('Delete', { selector: '.set-swipe__delete' })).toBeTruthy();
  });

  it('a shorter swipe snaps back closed, and a swipe to the right does nothing', () => {
    renderRow();
    swipe(-40);
    expect(isOpen()).toBe(false);
    expect(content().classList.contains('set-row--shifted')).toBe(false);
    swipe(90);
    expect(isOpen()).toBe(false);
  });

  it('follows the finger while swiping', () => {
    renderRow();
    down(300, 100);
    move(285, 101);
    move(260, 101);
    expect(content().style.getPropertyValue('--swipe-x')).toBe('-40px');
    up(260, 101);
    expect(isOpen()).toBe(false);
  });

  it('a mostly vertical movement is a scroll: nothing opens, even if it drifts sideways', () => {
    renderRow();
    down(300, 100);
    move(297, 118); // decided: vertical
    move(200, 125); // too late to become a swipe
    up(200, 125);
    expect(isOpen()).toBe(false);
    expect(content().classList.contains('set-row--shifted')).toBe(false);
  });

  it('a touch cancelled by the browser (a scroll took over) leaves the row as it was', () => {
    renderRow();
    swipe(-70);
    expect(isOpen()).toBe(true);
    down(300, 100);
    move(330, 101);
    fireEvent.pointerCancel(li(), { clientX: 330, clientY: 101, ...touch() });
    expect(isOpen()).toBe(true);
  });

  it('closes with a swipe back, or when something else is touched', () => {
    renderRow();
    swipe(-70);
    expect(isOpen()).toBe(true);
    swipe(50);
    expect(isOpen()).toBe(false);

    swipe(-70);
    expect(isOpen()).toBe(true);
    fireEvent.pointerDown(document.body, { clientX: 5, clientY: 5, ...touch() });
    expect(isOpen()).toBe(false);
  });

  it('the tap that ends a swipe, or the next tap on an open row, only closes it', () => {
    renderRow();
    swipe(-70);
    fireEvent.click(weightButton()); // the click a browser sends after the finger lifts
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(isOpen()).toBe(false);

    swipe(-70);
    expect(isOpen()).toBe(true);
    fireEvent.click(weightButton());
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(isOpen()).toBe(false);
    // Closed again, the weight button works as usual.
    fireEvent.click(weightButton());
    expect(document.querySelector('dialog[open]')).toBeTruthy();
  });

  it('the Delete button works from the keyboard: focusing it slides the row open', async () => {
    renderRow();
    const del = screen.getByLabelText('Delete set 1');
    act(() => del.focus());
    expect(isOpen()).toBe(true);
    act(() => del.blur());
    expect(isOpen()).toBe(false);
    fireEvent.click(del);
    await waitFor(async () => expect((await getDraft(db, sessionId))!.items[0]!.rows).toEqual([]));
  });

  it('does not start a swipe from the Delete button itself', () => {
    renderRow();
    swipe(-70);
    down(250, 100, screen.getByLabelText('Delete set 1'));
    move(150, 101);
    up(150, 101);
    expect(isOpen()).toBe(true);
  });
});
