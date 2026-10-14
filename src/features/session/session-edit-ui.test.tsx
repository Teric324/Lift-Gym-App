// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { checkDraftRow, getDraft } from '../../db/repo/drafts';
import { addExercise } from '../../db/repo/exercises';
import { finishSession, startSession } from '../../db/repo/sessions';
import { addSet, listSetsForSession } from '../../db/repo/sets';
import { createWorkout, getWorkout } from '../../db/repo/workouts';
import type { Exercise, Workout } from '../../domain/types';
import { SessionScreen } from './SessionScreen';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 5, 18, 0).getTime();

let bench: Exercise;
let incline: Exercise;
let fly: Exercise;
let push: Workout;
let sessionId: string;

beforeEach(async () => {
  bench = await addExercise(db, 'Bench press');
  incline = await addExercise(db, 'Incline dumbbell press');
  fly = await addExercise(db, 'Cable fly');
  await addExercise(db, 'Curl');
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
  push = await createWorkout(db, 'Push', [bench.id, fly.id]);
  const started = await startSession(db, push.id, T0);
  sessionId = started.session.id;
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

function renderSession() {
  render(
    <MemoryRouter initialEntries={['/session']}>
      <Routes>
        <Route path="*" element={<SessionScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const cards = () => [...document.querySelectorAll<HTMLElement>('article.exercise-card')];
const cardTitles = () => cards().map((c) => c.querySelector('.exercise-card__title')?.textContent);
const cardFor = (name: string) =>
  cards().find((c) => c.querySelector('.exercise-card__title')?.textContent === name)!;
const rowCount = (name: string) => cardFor(name).querySelectorAll('.set-row').length;
const openDialog = () => document.querySelector('dialog[open]') as HTMLDialogElement | null;
const dialogButton = (name: string) =>
  [...(openDialog()?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent?.trim() === name,
  ) as HTMLButtonElement | undefined;
const waitForDialog = () => waitFor(() => expect(openDialog()).toBeTruthy());
const waitForCards = (titles: string[]) => waitFor(() => expect(cardTitles()).toEqual(titles));

async function checkRow(exercise: Exercise, index: number) {
  const draft = (await getDraft(db, sessionId))!;
  const item = draft.items.find((i) => i.exerciseId === exercise.id)!;
  await checkDraftRow(db, sessionId, exercise.id, item.rows[index]!.id, T0 + 1000 * (index + 1));
}

describe('session screen: reordering', () => {
  it('↑ and ↓ move exercises and disable at the ends', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    expect(
      (within(cardFor('Bench press')).getByLabelText('Move Bench press up') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (within(cardFor('Cable fly')).getByLabelText('Move Cable fly down') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(within(cardFor('Bench press')).getByLabelText('Move Bench press down'));
    await waitForCards(['Cable fly', 'Bench press']);
    fireEvent.click(within(cardFor('Bench press')).getByLabelText('Move Bench press up'));
    await waitForCards(['Bench press', 'Cable fly']);
  });
});

describe('session screen: skipping', () => {
  async function openMenuAndSkip(name: string) {
    fireEvent.click(within(cardFor(name)).getByLabelText(`More actions for ${name}`));
    await waitForDialog();
    fireEvent.click(dialogButton('Skip this exercise')!);
  }

  it('skips an exercise without checked sets at once; Bring back restores it', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await openMenuAndSkip('Cable fly');
    await waitForCards(['Bench press']);
    expect(screen.getByText('Skipped (1)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Bring back' }));
    await waitForCards(['Bench press', 'Cable fly']);
    expect(screen.queryByText('Skipped (1)')).toBeNull();
  });

  it('with checked sets it asks; Cancel keeps everything', async () => {
    await checkRow(bench, 0);
    await checkRow(bench, 1);
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await openMenuAndSkip('Bench press');
    await waitFor(() => expect(openDialog()?.textContent).toMatch(/removes its 2 checked sets/));

    fireEvent.click(dialogButton('Cancel')!);
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(cardTitles()).toEqual(['Bench press', 'Cable fly']);
    expect(await listSetsForSession(db, sessionId)).toHaveLength(2);
  });

  it('confirming removes the checked sets; Bring back returns the rows unchecked', async () => {
    await checkRow(bench, 0);
    await checkRow(bench, 1);
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await openMenuAndSkip('Bench press');
    await waitFor(() => expect(dialogButton('Skip and remove sets')).toBeTruthy());
    fireEvent.click(dialogButton('Skip and remove sets')!);

    await waitForCards(['Cable fly']);
    expect(await listSetsForSession(db, sessionId)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Bring back' }));
    await waitForCards(['Bench press', 'Cable fly']);
    expect(rowCount('Bench press')).toBe(2);
    expect(cardFor('Bench press').querySelectorAll('.set-row__check--done').length).toBe(0);
  });
});

describe('session screen: adding an exercise', () => {
  it('adds one without history: an empty card with Add set, and the routine unchanged', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitForDialog();
    await waitFor(() => expect(openDialog()!.textContent).toMatch(/Curl/));
    // The exercises already in the session are not offered.
    const offered = [...openDialog()!.querySelectorAll('.list__title')].map((e) => e.textContent);
    expect(offered).toContain('Curl');
    expect(offered).not.toContain('Bench press');
    expect(offered).not.toContain('Cable fly');

    fireEvent.click(within(openDialog()!).getByLabelText(/Curl/));
    fireEvent.click(dialogButton('Add 1')!);

    await waitForCards(['Bench press', 'Cable fly', 'Curl']);
    expect(rowCount('Curl')).toBe(0);
    expect(cardFor('Curl').textContent).toMatch(/No sets yet/);
    expect((await getWorkout(db, push.id))?.exerciseIds).toEqual([bench.id, fly.id]);

    // Add set works on the empty card and starts blank (checking is disabled until filled in).
    fireEvent.click(within(cardFor('Curl')).getByRole('button', { name: 'Add set' }));
    await waitFor(() => expect(rowCount('Curl')).toBe(1));
    expect(
      (within(cardFor('Curl')).getByLabelText('Mark set as done') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('can create a new exercise from the picker and add it', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitForDialog();
    await waitFor(() => expect(openDialog()!.textContent).toMatch(/Curl/));
    fireEvent.change(within(openDialog()!).getByLabelText('Search or type a new name'), {
      target: { value: 'Lateral raise' },
    });
    fireEvent.click(dialogButton('Create "Lateral raise"')!);
    await waitFor(() => expect(dialogButton('Add 1')).toBeTruthy());
    fireEvent.click(dialogButton('Add 1')!);
    await waitForCards(['Bench press', 'Cable fly', 'Lateral raise']);
  });
});

describe('session screen: replacing an exercise', () => {
  async function startReplace(name: string, withName: string) {
    fireEvent.click(within(cardFor(name)).getByLabelText(`More actions for ${name}`));
    await waitForDialog();
    fireEvent.click(dialogButton('Replace with another exercise…')!);
    await waitFor(() => expect(openDialog()?.textContent).toMatch(`Replace ${name} with…`));
    fireEvent.click(
      within(openDialog()!).getByText(withName, { selector: '.list__title' }).closest('button')!,
    );
    await waitFor(() =>
      expect(openDialog()?.textContent).toMatch(`Replace ${name} with ${withName}?`),
    );
  }

  it('only today is the default; the new exercise uses its own history, history stays put', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await startReplace('Bench press', 'Incline dumbbell press');

    const only = within(openDialog()!).getByLabelText(/Only today/) as HTMLInputElement;
    expect(only.checked).toBe(true);
    expect(openDialog()!.textContent).toMatch(/removed from this workout/);
    fireEvent.click(dialogButton('Replace')!);

    await waitForCards(['Incline dumbbell press', 'Cable fly']);
    const weight = within(cardFor('Incline dumbbell press')).getByLabelText('Weight (kg)');
    expect(weight.textContent).toMatch(/^30\s+kg$/); // its own last session, not bench's 80
    expect(cardFor('Incline dumbbell press').textContent).toMatch(/Instead of Bench press/);
    expect((await getWorkout(db, push.id))?.exerciseIds).toEqual([bench.id, fly.id]);
  });

  it('with 2 sets already checked, the old exercise stays with them and the new one follows', async () => {
    await checkRow(bench, 0);
    await checkRow(bench, 1);
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await startReplace('Bench press', 'Incline dumbbell press');
    expect(openDialog()!.textContent).toMatch(/Bench press keeps its 2 sets already done/);
    fireEvent.click(dialogButton('Replace')!);

    await waitForCards(['Bench press', 'Incline dumbbell press', 'Cable fly']);
    expect(rowCount('Bench press')).toBe(2);
    expect(cardFor('Bench press').querySelectorAll('.set-row__check--done')).toHaveLength(2);
    const stored = await listSetsForSession(db, sessionId);
    expect(stored).toHaveLength(2);
    expect(stored.every((s) => s.exerciseId === bench.id)).toBe(true);
  });

  it('Update the workout changes the routine at the same position', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await startReplace('Bench press', 'Incline dumbbell press');
    fireEvent.click(within(openDialog()!).getByLabelText(/Update the workout/));
    fireEvent.click(dialogButton('Replace')!);

    await waitForCards(['Incline dumbbell press', 'Cable fly']);
    await waitFor(async () =>
      expect((await getWorkout(db, push.id))?.exerciseIds).toEqual([incline.id, fly.id]),
    );
  });

  it('Update the workout is disabled for an exercise added today', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitForDialog();
    await waitFor(() => expect(openDialog()!.textContent).toMatch(/Curl/));
    fireEvent.click(within(openDialog()!).getByLabelText(/Curl/));
    fireEvent.click(dialogButton('Add 1')!);
    await waitForCards(['Bench press', 'Cable fly', 'Curl']);

    await startReplace('Curl', 'Incline dumbbell press');
    const update = within(openDialog()!).getByLabelText(/Update the workout/) as HTMLInputElement;
    expect(update.disabled).toBe(true);
    expect(openDialog()!.textContent).toMatch(/added today/);
    fireEvent.click(dialogButton('Replace')!);
    await waitForCards(['Bench press', 'Cable fly', 'Incline dumbbell press']);
  });

  it('Cancel in the confirmation changes nothing', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    await startReplace('Bench press', 'Incline dumbbell press');
    fireEvent.click(dialogButton('Cancel')!);
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(cardTitles()).toEqual(['Bench press', 'Cable fly']);
    expect((await getDraft(db, sessionId))!.items.map((i) => i.exerciseId)).toEqual([
      bench.id,
      fly.id,
    ]);
  });

  it('the pick list leaves out exercises already in the session and archived ones', async () => {
    renderSession();
    await waitForCards(['Bench press', 'Cable fly']);
    fireEvent.click(within(cardFor('Bench press')).getByLabelText('More actions for Bench press'));
    await waitForDialog();
    fireEvent.click(dialogButton('Replace with another exercise…')!);
    await waitFor(() => expect(openDialog()?.textContent).toMatch('Replace Bench press with…'));
    const offered = [...openDialog()!.querySelectorAll('.list__title')].map((e) => e.textContent);
    expect(offered).toEqual(expect.arrayContaining(['Incline dumbbell press', 'Curl']));
    expect(offered).not.toContain('Bench press');
    expect(offered).not.toContain('Cable fly');
  });
});
