// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { addExercise } from '../../db/repo/exercises';
import { finishSession, startSession } from '../../db/repo/sessions';
import { addSet, listAllSets, listSetsForSession } from '../../db/repo/sets';
import { createWorkout } from '../../db/repo/workouts';
import type { Exercise, Session, Workout } from '../../domain/types';
import { ExerciseHistory } from '../exercises/ExerciseHistory';
import { HistoryListScreen } from './HistoryListScreen';
import { HistorySessionScreen } from './HistorySessionScreen';

const DAY = 24 * 60 * 60 * 1000;

let bench: Exercise;
let fly: Exercise;
let push: Workout;

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderAt(path: string, element: React.ReactNode, routePath = '*') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={routePath}
          element={
            <>
              {element}
              <Where />
            </>
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function finishedSession(
  at: number,
  entries: [Exercise, number, number][],
  workout: Workout = push,
): Promise<Session> {
  const { session } = await startSession(db, workout.id, at);
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
}

beforeEach(async () => {
  bench = await addExercise(db, 'Bench press');
  fly = await addExercise(db, 'Cable fly');
  push = await createWorkout(db, 'Push', [bench.id, fly.id]);
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

const openDialog = () => document.querySelector('dialog[open]') as HTMLDialogElement | null;
const dialogButton = (name: string) =>
  [...(openDialog()?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent?.trim() === name,
  ) as HTMLButtonElement | undefined;
const where = () => screen.getByTestId('where').textContent;

describe('HistoryListScreen', () => {
  it('shows an empty state without finished workouts', async () => {
    renderAt('/history', <HistoryListScreen />);
    await waitFor(() => expect(screen.getByText(/No finished workouts yet/)).toBeTruthy());
  });

  it('lists finished workouts by month, newest first, and leaves out the active one', async () => {
    await finishedSession(new Date(2026, 7, 30, 18, 0).getTime(), [[bench, 95, 5]]);
    await finishedSession(new Date(2026, 9, 5, 18, 0).getTime(), [
      [bench, 100, 5],
      [bench, 102.5, 4],
      [fly, 22.5, 10],
    ]);
    await startSession(db, push.id, new Date(2026, 9, 14, 18, 0).getTime());

    renderAt('/history', <HistoryListScreen />);
    await waitFor(() => expect(screen.getByText('October 2026')).toBeTruthy());
    const months = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(months).toEqual(['October 2026', 'August 2026']);
    const rows = screen.getAllByRole('link').map((a) => a.textContent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/Mon 5 Oct · Push/);
    expect(rows[0]).toMatch(/2 exercises · 3 sets/);
    expect(rows[1]).toMatch(/Sun 30 Aug · Push/);
  });
});

describe('HistorySessionScreen: reading', () => {
  it('shows the exercises and sets without any edit controls', async () => {
    const session = await finishedSession(new Date(2026, 9, 12, 18, 0).getTime(), [
      [bench, 80, 5],
      [bench, 82.5, 4],
      [fly, 25, 12],
    ]);
    renderAt(`/history/${session.id}`, <HistorySessionScreen />, '/history/:id');
    await waitFor(() => expect(screen.getByText('80 kg × 5')).toBeTruthy());
    expect(screen.getByText('82.5 kg × 4')).toBeTruthy();
    expect(screen.getByText('25 kg × 12')).toBeTruthy();
    expect(screen.getByText('2 exercises · 3 sets')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add set' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete this workout' })).toBeNull();
  });

  it('says so for a workout that is not in the history', async () => {
    renderAt('/history/ghost', <HistorySessionScreen />, '/history/:id');
    await waitFor(() => expect(screen.getByText(/not in your history/)).toBeTruthy());
  });

  it('offers to open a workout that is still in progress instead of editing it', async () => {
    const { session } = await startSession(db, push.id);
    renderAt(`/history/${session.id}`, <HistorySessionScreen />, '/history/:id');
    await waitFor(() => expect(screen.getByText(/still in progress/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });
});

describe('HistorySessionScreen: editing', () => {
  async function openEditing(entries: [Exercise, number, number][]) {
    const session = await finishedSession(new Date(2026, 9, 12, 18, 0).getTime(), entries);
    renderAt(`/history/${session.id}`, <HistorySessionScreen />, '/history/:id');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy());
    return session;
  }

  it('correcting a weight in its input saves at once and keeps the reps', async () => {
    const session = await openEditing([
      [bench, 80, 5],
      [bench, 82.5, 4],
    ]);
    fireEvent.change(screen.getAllByLabelText('Weight (kg)')[0]!, { target: { value: '85' } });
    await waitFor(async () => {
      const sets = await listSetsForSession(db, session.id);
      expect(sets.map((s) => [s.weightGrams, s.reps]).sort()).toEqual([
        [82500, 4],
        [85000, 5],
      ]);
    });
  });

  it('typing new reps saves at once and keeps the weight', async () => {
    const session = await openEditing([[bench, 80, 5]]);
    expect(screen.queryByRole('button', { name: /One rep/ })).toBeNull(); // no - / + buttons
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '6' } });
    await waitFor(async () => {
      expect((await listSetsForSession(db, session.id))[0]!.reps).toBe(6);
    });
    expect((await listSetsForSession(db, session.id))[0]!.weightGrams).toBe(80000);
  });

  it('Add set copies the last set of the exercise and goes after it', async () => {
    const session = await openEditing([
      [bench, 80, 5],
      [bench, 82.5, 4],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Add set' }));
    await waitFor(async () => {
      const sets = await listSetsForSession(db, session.id);
      expect(sets).toHaveLength(3);
      const added = sets.find((s) => s.order === 2)!;
      expect([added.weightGrams, added.reps]).toEqual([82500, 4]);
    });
  });

  it('removing a set that is not the last one deletes it at once', async () => {
    const session = await openEditing([
      [bench, 80, 5],
      [bench, 82.5, 4],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove set 1' }));
    await waitFor(async () => expect(await listSetsForSession(db, session.id)).toHaveLength(1));
    expect(openDialog()).toBeNull();
  });

  it('removing the only set asks, and confirming deletes the whole workout', async () => {
    const session = await openEditing([[bench, 80, 5]]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove set 1' }));
    await waitFor(() => expect(openDialog()?.textContent).toMatch(/only set/));
    // Nothing is deleted before the answer.
    expect(await listSetsForSession(db, session.id)).toHaveLength(1);

    fireEvent.click(dialogButton('Delete workout')!);
    await waitFor(() => expect(where()).toBe('/history'));
    expect(await db.sessions.get(session.id)).toBeUndefined();
    expect(await listAllSets(db)).toEqual([]);
  });

  it('Cancel on the last-set question changes nothing', async () => {
    const session = await openEditing([[bench, 80, 5]]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove set 1' }));
    await waitFor(() => expect(openDialog()).toBeTruthy());
    fireEvent.click(dialogButton('Cancel')!);
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(await db.sessions.get(session.id)).toBeDefined();
    expect(await listSetsForSession(db, session.id)).toHaveLength(1);
    expect(where()).toMatch(/\/history\//);
  });

  it('Delete this workout asks with the number of sets, then removes it and goes back', async () => {
    const other = await finishedSession(new Date(2026, 9, 5, 18, 0).getTime(), [[bench, 70, 8]]);
    const session = await openEditing([
      [bench, 80, 5],
      [fly, 25, 12],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete this workout' }));
    await waitFor(() => expect(openDialog()?.textContent).toMatch(/2 sets of Mon 12 Oct/));

    fireEvent.click(dialogButton('Delete workout')!);
    await waitFor(() => expect(where()).toBe('/history'));
    expect(await db.sessions.get(session.id)).toBeUndefined();
    // The other workout is untouched.
    expect(await db.sessions.get(other.id)).toBeDefined();
    expect(await listAllSets(db)).toHaveLength(1);
  });

  it('Done leaves edit mode', async () => {
    await openEditing([[bench, 80, 5]]);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Add set' })).toBeNull();
  });
});

describe('ExerciseHistory', () => {
  it('shows the workouts where the exercise was done, newest first, with the sets', async () => {
    await finishedSession(new Date(2026, 9, 5, 18, 0).getTime(), [
      [bench, 100, 5],
      [fly, 20, 12],
    ]);
    await finishedSession(new Date(2026, 9, 12, 18, 0).getTime(), [
      [bench, 105, 3],
      [bench, 90, 8],
    ]);
    renderAt('/exercises/x', <ExerciseHistory exerciseId={bench.id} />);
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    const rows = screen.getAllByRole('link').map((a) => a.textContent);
    expect(rows[0]).toMatch(/Mon 12 Oct · Push/);
    expect(rows[0]).toMatch(/105×3, 90×8/);
    expect(rows[1]).toMatch(/Mon 5 Oct · Push/);
    expect(rows[1]).toMatch(/100×5/);
    expect(rows[1]).not.toMatch(/20×12/);
  });

  it('says so when the exercise was never done', async () => {
    renderAt('/exercises/x', <ExerciseHistory exerciseId={fly.id} />);
    await waitFor(() => expect(screen.getByText(/Not done in any finished workout/)).toBeTruthy());
  });

  it('shows the first 20 and the rest after Show all', async () => {
    for (let i = 0; i < 23; i++) {
      await finishedSession(new Date(2026, 0, 1, 18, 0).getTime() + i * DAY, [[bench, 50 + i, 5]]);
    }
    renderAt('/exercises/x', <ExerciseHistory exerciseId={bench.id} />);
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(20));
    fireEvent.click(screen.getByRole('button', { name: 'Show all 23' }));
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(23));
  });
});
