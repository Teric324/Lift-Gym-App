// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { addExercise } from '../../db/repo/exercises';
import { checkDraftRow } from '../../db/repo/drafts';
import { getActiveSession, listSessions, startSession } from '../../db/repo/sessions';
import { addSet, listAllSets } from '../../db/repo/sets';
import { createWorkout, getWorkout } from '../../db/repo/workouts';
import type { Exercise, Workout } from '../../domain/types';
import { StartWorkoutButton } from './StartWorkoutButton';

const DAY = 24 * 60 * 60 * 1000;

let exercise: Exercise;
let workout: Workout;

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderButton(w: Workout = workout) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <StartWorkoutButton workout={w} />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;
const clickStart = () => fireEvent.click(screen.getByText('Start'));
/** The dialog is always in the DOM; wait until it is actually open (and no longer busy). */
const dialogOpen = () =>
  waitFor(() => {
    const dialog = document.querySelector('dialog[open]');
    expect(dialog).toBeTruthy();
    expect(dialog!.querySelector('button:disabled')).toBeNull();
  });
const dialogButton = (name: string) => screen.queryByText(name, { selector: 'dialog button' });

beforeEach(async () => {
  exercise = await addExercise(db, 'Bench press');
  workout = await createWorkout(db, 'Push', [exercise.id]);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

/** An active session of `workout`, started `daysAgo` days ago, with `sets` checked sets. */
async function activeSession(daysAgo: number, sets: number) {
  const started = Date.now() - daysAgo * DAY;
  const { session, draft } = await startSession(db, workout.id, started);
  for (let i = 0; i < sets; i++) {
    const row = draft.items[0]!.rows[i];
    if (row) await checkDraftRow(db, session.id, exercise.id, row.id, started + 1000 * (i + 1));
    else
      await addSet(
        db,
        { sessionId: session.id, exerciseId: exercise.id, weightGrams: 50000, reps: 5 },
        started + 1000 * (i + 1),
      );
  }
  return session;
}

describe('StartWorkoutButton', () => {
  it('starts a session and opens /session when nothing is active', async () => {
    renderButton();
    clickStart();
    await waitFor(() => expect(where()).toBe('/session'));
    const active = await getActiveSession(db);
    expect(active?.workoutId).toBe(workout.id);
  });

  it('is disabled for a workout without exercises', () => {
    renderButton({ ...workout, exerciseIds: [] });
    expect((screen.getByText('Start') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a session from today: offers to resume it, does not start another', async () => {
    const existing = await activeSession(0, 0);
    renderButton();
    clickStart();
    await dialogOpen();
    expect(screen.getByText('A workout is already in progress')).toBeTruthy();
    expect(dialogButton('Resume it')).toBeTruthy();
    expect(dialogButton('Finish it and start the new one')).toBeNull();
    expect(dialogButton('Discard it')).toBeNull();

    fireEvent.click(dialogButton('Resume it')!);
    await waitFor(() => expect(where()).toBe('/session'));
    expect((await listSessions(db)).map((s) => s.id)).toEqual([existing.id]);
  });

  it('an older session with sets: open it or finish it first, never discard', async () => {
    await activeSession(3, 1);
    renderButton();
    clickStart();
    await dialogOpen();
    expect(screen.getByText('You have an unfinished workout')).toBeTruthy();
    expect(dialogButton('Open it')).toBeTruthy();
    expect(dialogButton('Finish it and start the new one')).toBeTruthy();
    expect(dialogButton('Discard it')).toBeNull();
  });

  it('finish and start: the old session ends at its last set, a new one starts', async () => {
    const old = await activeSession(3, 1);
    const lastSetTime = (await listAllSets(db))[0]!.createdAt;
    renderButton();
    clickStart();
    await dialogOpen();
    fireEvent.click(dialogButton('Finish it and start the new one')!);

    await waitFor(() => expect(where()).toBe('/session'));
    const sessions = await listSessions(db);
    expect(sessions).toHaveLength(2);
    const finished = sessions.find((s) => s.id === old.id)!;
    expect(finished.finishedAt).toBe(lastSetTime);
    const active = await getActiveSession(db);
    expect(active?.id).not.toBe(old.id);
    // The old session's set is kept.
    expect(await listAllSets(db)).toHaveLength(1);
  });

  it('an older session with no sets can be discarded, then the new one starts', async () => {
    const old = await activeSession(3, 0);
    renderButton();
    clickStart();
    await dialogOpen();
    fireEvent.click(dialogButton('Discard it')!);

    await waitFor(() => expect(where()).toBe('/session'));
    const sessions = await listSessions(db);
    expect(sessions.map((s) => s.id)).not.toContain(old.id);
    expect(sessions).toHaveLength(1);
  });

  it('cancel changes nothing', async () => {
    const old = await activeSession(3, 1);
    renderButton();
    clickStart();
    await dialogOpen();
    fireEvent.click(dialogButton('Cancel')!);
    expect(where()).toBe('/');
    expect((await getActiveSession(db))?.id).toBe(old.id);
    expect(await listAllSets(db)).toHaveLength(1);
    expect(await getWorkout(db, workout.id)).toBeDefined();
  });
});
