// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { addExercise } from '../../db/repo/exercises';
import { finishSession, startSession } from '../../db/repo/sessions';
import { createWorkout } from '../../db/repo/workouts';
import type { Workout } from '../../domain/types';
import { WorkoutEditorScreen } from './WorkoutEditorScreen';

const NOTE = 'A workout is in progress. Changes here apply from the next start.';

let push: Workout;
let pull: Workout;

beforeEach(async () => {
  const bench = await addExercise(db, 'Bench press');
  push = await createWorkout(db, 'Push', [bench.id]);
  pull = await createWorkout(db, 'Pull', [bench.id]);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

function renderEditor(workoutId: string) {
  render(
    <MemoryRouter initialEntries={[`/workouts/${workoutId}`]}>
      <Routes>
        <Route path="/workouts/:id" element={<WorkoutEditorScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const heading = (name: string) =>
  waitFor(() => expect(screen.getByRole('heading', { name })).toBeTruthy());

describe('routine editor: note while a workout of the routine is in progress', () => {
  it('is not shown when nothing is in progress', async () => {
    renderEditor(push.id);
    await heading('Push');
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('is shown when a workout of this routine is in progress', async () => {
    await startSession(db, push.id);
    renderEditor(push.id);
    await heading('Push');
    await waitFor(() => expect(screen.getByText(NOTE)).toBeTruthy());
  });

  it('is not shown for another routine, even while a workout is in progress', async () => {
    await startSession(db, push.id);
    renderEditor(pull.id);
    await heading('Pull');
    // Give the active session time to load; the note must stay absent.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('appears and disappears as the workout starts and finishes', async () => {
    renderEditor(push.id);
    await heading('Push');
    expect(screen.queryByText(NOTE)).toBeNull();

    const { session } = await startSession(db, push.id);
    await waitFor(() => expect(screen.getByText(NOTE)).toBeTruthy());

    await finishSession(db, session.id, Date.now());
    await waitFor(() => expect(screen.queryByText(NOTE)).toBeNull());
  });

  it('the editor stays fully usable while the note is shown (it is information only)', async () => {
    await startSession(db, push.id);
    renderEditor(push.id);
    await waitFor(() => expect(screen.getByText(NOTE)).toBeTruthy());
    // The editor stays fully usable: the exercise list and the add button are there.
    expect(screen.getByRole('button', { name: 'Add exercises' })).toBeTruthy();
    expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
  });
});
