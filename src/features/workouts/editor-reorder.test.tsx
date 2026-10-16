// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { addExercise } from '../../db/repo/exercises';
import { createWorkout, getWorkout } from '../../db/repo/workouts';
import type { Workout } from '../../domain/types';
import { WorkoutEditorScreen } from './WorkoutEditorScreen';

let workout: Workout;
let ids: string[];

beforeEach(async () => {
  const bench = await addExercise(db, 'Bench press');
  const fly = await addExercise(db, 'Cable fly');
  const dip = await addExercise(db, 'Dips');
  ids = [bench.id, fly.id, dip.id];
  workout = await createWorkout(db, 'Push', ids);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('ol.list > li'));
const titles = () => rows().map((r) => r.querySelector('.list__title')!.textContent);
const waitForTitles = (expected: string[]) => waitFor(() => expect(titles()).toEqual(expected));
const handleOf = (name: string) => screen.getByLabelText(`Reorder ${name}`) as HTMLButtonElement;
const touch = { pointerId: 3, pointerType: 'touch' };

function renderEditor() {
  render(
    <MemoryRouter initialEntries={[`/workouts/${workout.id}`]}>
      <Routes>
        <Route path="/workouts/:id" element={<WorkoutEditorScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** jsdom has no layout: give the rows a 60 px height, stacked from the top. */
function layOut() {
  rows().forEach((row, index) => {
    row.getBoundingClientRect = () =>
      ({
        top: index * 60,
        bottom: index * 60 + 60,
        height: 60,
        left: 0,
        right: 300,
        width: 300,
      }) as DOMRect;
  });
}

describe('routine editor: reordering the exercises', () => {
  it('has a drag handle and a remove button per exercise, and no up / down buttons', async () => {
    renderEditor();
    await waitForTitles(['Bench press', 'Cable fly', 'Dips']);
    expect(screen.queryByLabelText(/Move .* (up|down)/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/[↑↓]/);
    const row = rows()[0]!;
    expect(
      within(row).getByLabelText('Reorder Bench press').classList.contains('drag-handle'),
    ).toBe(true);
    expect(within(row).getByLabelText('Remove Bench press')).toBeTruthy();
  });

  it('dragging a handle and dropping saves the new order to the routine', async () => {
    renderEditor();
    await waitForTitles(['Bench press', 'Cable fly', 'Dips']);
    layOut();
    fireEvent.pointerDown(handleOf('Bench press'), { clientY: 30, ...touch });
    fireEvent.pointerMove(handleOf('Bench press'), { clientY: 100, ...touch });
    fireEvent.pointerUp(handleOf('Bench press'), { clientY: 100, ...touch });
    // The dropped order shows at once, then it is stored.
    expect(titles()).toEqual(['Cable fly', 'Bench press', 'Dips']);
    await waitFor(async () =>
      expect((await getWorkout(db, workout.id))!.exerciseIds).toEqual([ids[1], ids[0], ids[2]]),
    );
  });

  it('the arrow keys on the handle move the exercise and keep the focus on it', async () => {
    renderEditor();
    await waitForTitles(['Bench press', 'Cable fly', 'Dips']);
    fireEvent.keyDown(handleOf('Bench press'), { key: 'ArrowUp' }); // at the top: nothing
    fireEvent.keyDown(handleOf('Dips'), { key: 'ArrowDown' }); // at the bottom: nothing
    expect(titles()).toEqual(['Bench press', 'Cable fly', 'Dips']);

    handleOf('Dips').focus();
    fireEvent.keyDown(handleOf('Dips'), { key: 'ArrowUp' });
    await waitForTitles(['Bench press', 'Dips', 'Cable fly']);
    expect(document.activeElement).toBe(handleOf('Dips'));
    await waitFor(async () =>
      expect((await getWorkout(db, workout.id))!.exerciseIds).toEqual([ids[0], ids[2], ids[1]]),
    );
  });

  it('removing an exercise still works', async () => {
    renderEditor();
    await waitForTitles(['Bench press', 'Cable fly', 'Dips']);
    fireEvent.click(screen.getByLabelText('Remove Cable fly'));
    await waitForTitles(['Bench press', 'Dips']);
  });
});
