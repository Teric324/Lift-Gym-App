// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { addExerciseToDraft, checkDraftRow, getDraft, skipDraftItem } from '../../db/repo/drafts';
import { addExercise } from '../../db/repo/exercises';
import { finishSession, startSession } from '../../db/repo/sessions';
import { addSet, listSetsForSession } from '../../db/repo/sets';
import { createWorkout, getWorkout } from '../../db/repo/workouts';
import type { Exercise, Workout } from '../../domain/types';
import { SessionExerciseScreen } from './SessionExerciseScreen';
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

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderSession(path = '/session') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Path />
      <Routes>
        <Route path="/session" element={<SessionScreen />} />
        <Route path="/session/:exerciseId" element={<SessionExerciseScreen />} />
        <Route path="*" element={<p>Elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const path = () => screen.getByTestId('path').textContent;
const rows = () => [...document.querySelectorAll<HTMLElement>('li.session-row')];
const rowTitles = () => rows().map((r) => r.querySelector('.session-row__name')?.textContent);
const rowFor = (name: string) =>
  rows().find((r) => r.querySelector('.session-row__name')?.textContent === name)!;
const setRowCount = () => document.querySelectorAll('.set-row').length;
const title = () => document.querySelector('h1')?.textContent;
const openDialog = () => document.querySelector('dialog[open]') as HTMLDialogElement | null;
const dialogButton = (name: string) =>
  [...(openDialog()?.querySelectorAll('button') ?? [])].find(
    (b) => b.textContent?.trim() === name,
  ) as HTMLButtonElement | undefined;
const waitForDialog = () => waitFor(() => expect(openDialog()).toBeTruthy());
/** Waits for the overview list to show exactly these exercises, in this order. */
const waitForRows = (titles: string[]) => waitFor(() => expect(rowTitles()).toEqual(titles));
const waitForTitle = (name: string) => waitFor(() => expect(title()).toBe(name));

/** On the overview: taps an exercise to open its screen. */
async function openExercise(name: string) {
  await waitFor(() => expect(rowFor(name)).toBeTruthy());
  fireEvent.click(within(rowFor(name)).getByRole('link'));
  await waitForTitle(name);
}

async function checkRow(exercise: Exercise, index: number) {
  const draft = (await getDraft(db, sessionId))!;
  const item = draft.items.find((i) => i.exerciseId === exercise.id)!;
  await checkDraftRow(db, sessionId, exercise.id, item.rows[index]!.id, T0 + 1000 * (index + 1));
}

describe('overview: the rows', () => {
  it('shows the exercises compactly: progress, last checked set, nothing else', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    expect(document.querySelector('.set-row')).toBeNull();
    expect(rowFor('Bench press').textContent).toMatch(/0\/2 sets/);
    expect(rowFor('Bench press').textContent).not.toMatch(/kg/);
    expect(rowFor('Cable fly').textContent).toMatch(/0\/0 sets/);
    expect(screen.getByText(/0 of 2 sets done/)).toBeTruthy();

    await checkRow(bench, 0);
    await waitFor(() => expect(rowFor('Bench press').textContent).toMatch(/1\/2 sets/));
    expect(rowFor('Bench press').textContent).toMatch(/80 kg × 5/);
    expect(rowFor('Bench press').classList.contains('session-row--done')).toBe(false);
    expect(screen.getByText(/1 of 2 sets done/)).toBeTruthy();

    await checkRow(bench, 1);
    await waitFor(() => expect(rowFor('Bench press').textContent).toMatch(/2\/2 sets/));
    expect(rowFor('Bench press').textContent).toMatch(/82\.5 kg × 4/);
    expect(rowFor('Bench press').classList.contains('session-row--done')).toBe(true);
    expect(rowFor('Cable fly').classList.contains('session-row--done')).toBe(false);
  });

  it('tapping a row opens that exercise; the whole row but the handle is the link', async () => {
    renderSession();
    await openExercise('Cable fly');
    expect(path()).toBe(`/session/${fly.id}`);
    const handle = screen.queryByLabelText('Reorder Cable fly');
    expect(handle).toBeNull(); // no reorder handles on the exercise screen
  });

  it('every row has a drag handle that is a button with a 44 px area class', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    for (const name of ['Bench press', 'Cable fly']) {
      const handle = within(rowFor(name)).getByLabelText(`Reorder ${name}`);
      expect(handle.tagName).toBe('BUTTON');
      expect(handle.classList.contains('drag-handle')).toBe(true);
      expect(rowFor(name).querySelector('a')!.contains(handle)).toBe(false);
    }
  });
});

describe('overview: reordering', () => {
  const handleOf = (name: string) =>
    within(rowFor(name)).getByLabelText(`Reorder ${name}`) as HTMLButtonElement;
  const touch = { pointerId: 7, pointerType: 'touch' };

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
  const dragY = (name: string) => rowFor(name).style.getPropertyValue('--drag-y');

  it('ArrowDown and ArrowUp on the handle move the exercise and keep the focus on it', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    // At the ends nothing happens.
    fireEvent.keyDown(handleOf('Bench press'), { key: 'ArrowUp' });
    fireEvent.keyDown(handleOf('Cable fly'), { key: 'ArrowDown' });
    expect(rowTitles()).toEqual(['Bench press', 'Cable fly']);

    handleOf('Bench press').focus();
    fireEvent.keyDown(handleOf('Bench press'), { key: 'ArrowDown' });
    await waitForRows(['Cable fly', 'Bench press']);
    expect(document.activeElement).toBe(handleOf('Bench press'));
    fireEvent.keyDown(handleOf('Bench press'), { key: 'ArrowUp' });
    await waitForRows(['Bench press', 'Cable fly']);
    expect((await getDraft(db, sessionId))!.items.map((i) => i.exerciseId)).toEqual([
      bench.id,
      fly.id,
    ]);
  });

  it('dragging the handle moves the row with the finger and shows the gap; dropping saves', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    layOut();
    fireEvent.pointerDown(handleOf('Bench press'), { clientY: 30, ...touch });
    expect(rowFor('Bench press').classList.contains('drag-row--dragging')).toBe(true);
    fireEvent.pointerMove(handleOf('Bench press'), { clientY: 50, ...touch });
    // Not past the other row's middle yet: it stays where it is.
    expect(dragY('Bench press')).toBe('20px');
    expect(dragY('Cable fly')).toBe('0px');
    fireEvent.pointerMove(handleOf('Bench press'), { clientY: 100, ...touch });
    // The row is drawn no further than the last row's place (60 px down), though the finger
    // is 70 px down, so the scrolling area never grows under a drag.
    expect(dragY('Bench press')).toBe('60px');
    // Past the middle of Cable fly: it makes room (moves up by the dragged row's height).
    expect(dragY('Cable fly')).toBe('-60px');

    fireEvent.pointerUp(handleOf('Bench press'), { clientY: 100, ...touch });
    // The dropped order shows at once and is then written to the draft.
    expect(rowTitles()).toEqual(['Cable fly', 'Bench press']);
    expect(rows().every((r) => r.style.getPropertyValue('--drag-y') === '0px')).toBe(true);
    await waitFor(async () =>
      expect((await getDraft(db, sessionId))!.items.map((i) => i.exerciseId)).toEqual([
        fly.id,
        bench.id,
      ]),
    );
    expect(rowTitles()).toEqual(['Cable fly', 'Bench press']);
  });

  it('dragging up works too, and a drag that ends where it began changes nothing', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    layOut();
    fireEvent.pointerDown(handleOf('Cable fly'), { clientY: 90, ...touch });
    fireEvent.pointerMove(handleOf('Cable fly'), { clientY: 20, ...touch });
    expect(dragY('Bench press')).toBe('60px');
    fireEvent.pointerMove(handleOf('Cable fly'), { clientY: 85, ...touch });
    expect(dragY('Bench press')).toBe('0px');
    const before = (await getDraft(db, sessionId))!.updatedAt;
    fireEvent.pointerUp(handleOf('Cable fly'), { clientY: 85, ...touch });
    expect(rowTitles()).toEqual(['Bench press', 'Cable fly']);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await getDraft(db, sessionId))!.updatedAt).toBe(before);

    fireEvent.pointerDown(handleOf('Cable fly'), { clientY: 90, ...touch });
    fireEvent.pointerMove(handleOf('Cable fly'), { clientY: 20, ...touch });
    fireEvent.pointerUp(handleOf('Cable fly'), { clientY: 20, ...touch });
    await waitForRows(['Cable fly', 'Bench press']);
  });

  it('a cancelled drag (the system took the touch) drops nothing', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    layOut();
    fireEvent.pointerDown(handleOf('Bench press'), { clientY: 30, ...touch });
    fireEvent.pointerMove(handleOf('Bench press'), { clientY: 120, ...touch });
    fireEvent.pointerCancel(handleOf('Bench press'), { clientY: 120, ...touch });
    expect(rowTitles()).toEqual(['Bench press', 'Cable fly']);
    expect(rows().every((r) => r.style.getPropertyValue('--drag-y') === '0px')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await getDraft(db, sessionId))!.items.map((i) => i.exerciseId)).toEqual([
      bench.id,
      fly.id,
    ]);
  });

  it('ignores a second finger while one drag is going', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    layOut();
    fireEvent.pointerDown(handleOf('Bench press'), { clientY: 30, ...touch });
    fireEvent.pointerDown(handleOf('Cable fly'), {
      clientY: 90,
      pointerId: 8,
      pointerType: 'touch',
    });
    expect(rowFor('Cable fly').classList.contains('drag-row--dragging')).toBe(false);
    fireEvent.pointerCancel(handleOf('Bench press'), { clientY: 30, ...touch });
  });
});

describe('exercise screen', () => {
  it('shows the name, the set rows, Add set and the way to the next exercise', async () => {
    renderSession();
    await openExercise('Bench press');
    expect(setRowCount()).toBe(2);
    expect(screen.getByRole('link', { name: /Workout/ }).getAttribute('href')).toBe('/session');
    expect(screen.queryByText(/Step/)).toBeNull(); // no weight step on the screen
    expect(screen.getByRole('link', { name: 'Next: Cable fly →' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Back to workout' })).toBeNull();
    expect(screen.getByLabelText('More actions for Bench press')).toBeTruthy();
    // No exercise list here, and no per-row steppers.
    expect(document.querySelector('.session-row')).toBeNull();
    expect(screen.queryByLabelText('One rep more')).toBeNull();
  });

  it('Next goes to the next exercise; the last one offers Back to workout', async () => {
    renderSession();
    await openExercise('Bench press');
    fireEvent.click(screen.getByRole('link', { name: 'Next: Cable fly →' }));
    await waitForTitle('Cable fly');
    expect(path()).toBe(`/session/${fly.id}`);
    expect(screen.queryByRole('link', { name: /^Next:/ })).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Back to workout' }));
    await waitForRows(['Bench press', 'Cable fly']);
    expect(path()).toBe('/session');
  });

  it('the back link returns to the overview', async () => {
    renderSession();
    await openExercise('Bench press');
    fireEvent.click(screen.getByRole('link', { name: /Workout/ }));
    await waitForRows(['Bench press', 'Cable fly']);
  });

  it('next follows the current order and leaves out skipped exercises', async () => {
    await addExerciseToDraft(db, sessionId, incline.id);
    await skipDraftItem(db, sessionId, fly.id);
    renderSession(`/session/${bench.id}`);
    await waitForTitle('Bench press');
    expect(screen.getByRole('link', { name: 'Next: Incline dumbbell press →' })).toBeTruthy();
  });

  it('an exercise that is not in the session goes back to the overview', async () => {
    renderSession('/session/does-not-exist');
    await waitForRows(['Bench press', 'Cable fly']);
    expect(path()).toBe('/session');
  });

  it('a skipped exercise (stale URL) goes back to the overview too', async () => {
    await skipDraftItem(db, sessionId, fly.id);
    renderSession(`/session/${fly.id}`);
    await waitForRows(['Bench press']);
    expect(path()).toBe('/session');
  });

  it('after the workout is finished the URL leads to the overview, which says there is none', async () => {
    await checkRow(bench, 0);
    await finishSession(db, sessionId, T0 + 5000);
    renderSession(`/session/${bench.id}`);
    await waitFor(() => expect(screen.getByText(/No workout in progress/)).toBeTruthy());
    expect(path()).toBe('/session');
  });

  it('Add set appends a row', async () => {
    renderSession();
    await openExercise('Bench press');
    fireEvent.click(screen.getByRole('button', { name: 'Add set' }));
    await waitFor(() => expect(setRowCount()).toBe(3));
  });

  it('Delete on a swiped row removes it (see setrow tests for the gesture)', async () => {
    renderSession();
    await openExercise('Bench press');
    fireEvent.click(screen.getByLabelText('Delete set 2'));
    await waitFor(() => expect(setRowCount()).toBe(1));
  });
});

describe('exercise screen: skipping', () => {
  async function openMenuAndSkip(name: string) {
    await openExercise(name);
    fireEvent.click(screen.getByLabelText(`More actions for ${name}`));
    await waitForDialog();
    fireEvent.click(dialogButton('Skip this exercise')!);
  }

  it('skips an exercise without checked sets at once and returns to the overview; Bring back restores it', async () => {
    renderSession();
    await openMenuAndSkip('Cable fly');
    await waitForRows(['Bench press']);
    expect(path()).toBe('/session');
    expect(screen.getByText('Skipped (1)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Bring back' }));
    await waitForRows(['Bench press', 'Cable fly']);
    expect(screen.queryByText('Skipped (1)')).toBeNull();
  });

  it('with checked sets it asks; Cancel keeps everything and stays on the exercise', async () => {
    await checkRow(bench, 0);
    await checkRow(bench, 1);
    renderSession();
    await openMenuAndSkip('Bench press');
    await waitFor(() => expect(openDialog()?.textContent).toMatch(/removes its 2 checked sets/));

    fireEvent.click(dialogButton('Cancel')!);
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(title()).toBe('Bench press');
    expect(path()).toBe(`/session/${bench.id}`);
    expect(await listSetsForSession(db, sessionId)).toHaveLength(2);
  });

  it('confirming removes the checked sets and returns; Bring back returns the rows unchecked', async () => {
    await checkRow(bench, 0);
    await checkRow(bench, 1);
    renderSession();
    await openMenuAndSkip('Bench press');
    await waitFor(() => expect(dialogButton('Skip and remove sets')).toBeTruthy());
    fireEvent.click(dialogButton('Skip and remove sets')!);

    await waitForRows(['Cable fly']);
    expect(path()).toBe('/session');
    expect(await listSetsForSession(db, sessionId)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Bring back' }));
    await waitForRows(['Bench press', 'Cable fly']);
    await openExercise('Bench press');
    expect(setRowCount()).toBe(2);
    expect(document.querySelectorAll('.set-row__check--done').length).toBe(0);
  });
});

describe('overview: adding an exercise', () => {
  it('adds one without history: a row with 0/0 sets, then an empty exercise screen with Add set; the routine is unchanged', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
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

    await waitForRows(['Bench press', 'Cable fly', 'Curl']);
    expect(rowFor('Curl').textContent).toMatch(/0\/0 sets/);
    expect((await getWorkout(db, push.id))?.exerciseIds).toEqual([bench.id, fly.id]);

    await openExercise('Curl');
    expect(setRowCount()).toBe(0);
    expect(document.body.textContent).toMatch(/No sets yet/);
    expect(screen.getByRole('link', { name: 'Back to workout' })).toBeTruthy();

    // Add set starts blank (checking is disabled until it is filled in).
    fireEvent.click(screen.getByRole('button', { name: 'Add set' }));
    await waitFor(() => expect(setRowCount()).toBe(1));
    expect((screen.getByLabelText('Mark set as done') as HTMLButtonElement).disabled).toBe(true);
  });

  it('can create a new exercise from the picker and add it', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitForDialog();
    await waitFor(() => expect(openDialog()!.textContent).toMatch(/Curl/));
    fireEvent.change(within(openDialog()!).getByLabelText('Search or type a new name'), {
      target: { value: 'Lateral raise' },
    });
    fireEvent.click(dialogButton('Create "Lateral raise"')!);
    await waitFor(() => expect(dialogButton('Add 1')).toBeTruthy());
    fireEvent.click(dialogButton('Add 1')!);
    await waitForRows(['Bench press', 'Cable fly', 'Lateral raise']);
  });
});

describe('exercise screen: replacing an exercise', () => {
  async function startReplace(name: string, withName: string) {
    await openExercise(name);
    fireEvent.click(screen.getByLabelText(`More actions for ${name}`));
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

  it('only today is the default; the new exercise uses its own history and its screen opens', async () => {
    renderSession();
    await startReplace('Bench press', 'Incline dumbbell press');

    const only = within(openDialog()!).getByLabelText(/Only today/) as HTMLInputElement;
    expect(only.checked).toBe(true);
    expect(openDialog()!.textContent).toMatch(/removed from this workout/);
    fireEvent.click(dialogButton('Replace')!);

    // Straight to the replacement's own screen.
    await waitForTitle('Incline dumbbell press');
    expect(path()).toBe(`/session/${incline.id}`);
    expect(document.body.textContent).toMatch(/Instead of Bench press/);
    const weight = await screen.findByLabelText('Weight (kg)');
    expect((weight as HTMLInputElement).value).toBe('30'); // its own last session, not bench's 80
    expect((await getWorkout(db, push.id))?.exerciseIds).toEqual([bench.id, fly.id]);

    fireEvent.click(screen.getByRole('link', { name: /Workout/ }));
    await waitForRows(['Incline dumbbell press', 'Cable fly']);
    expect(rowFor('Incline dumbbell press').textContent).toMatch(/Instead of Bench press/);
  });

  it('with 2 sets already checked, the old exercise stays with them and the new one follows', async () => {
    await checkRow(bench, 0);
    await checkRow(bench, 1);
    renderSession();
    await startReplace('Bench press', 'Incline dumbbell press');
    expect(openDialog()!.textContent).toMatch(/Bench press keeps its 2 sets already done/);
    fireEvent.click(dialogButton('Replace')!);

    await waitForTitle('Incline dumbbell press');
    fireEvent.click(screen.getByRole('link', { name: /Workout/ }));
    await waitForRows(['Bench press', 'Incline dumbbell press', 'Cable fly']);
    expect(rowFor('Bench press').textContent).toMatch(/2\/2 sets/);
    expect(rowFor('Bench press').classList.contains('session-row--done')).toBe(true);
    const stored = await listSetsForSession(db, sessionId);
    expect(stored).toHaveLength(2);
    expect(stored.every((s) => s.exerciseId === bench.id)).toBe(true);
  });

  it('Update the workout changes the routine at the same position', async () => {
    renderSession();
    await startReplace('Bench press', 'Incline dumbbell press');
    fireEvent.click(within(openDialog()!).getByLabelText(/Update the workout/));
    fireEvent.click(dialogButton('Replace')!);

    await waitForTitle('Incline dumbbell press');
    await waitFor(async () =>
      expect((await getWorkout(db, push.id))?.exerciseIds).toEqual([incline.id, fly.id]),
    );
  });

  it('Update the workout is disabled for an exercise added today', async () => {
    renderSession();
    await waitForRows(['Bench press', 'Cable fly']);
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitForDialog();
    await waitFor(() => expect(openDialog()!.textContent).toMatch(/Curl/));
    fireEvent.click(within(openDialog()!).getByLabelText(/Curl/));
    fireEvent.click(dialogButton('Add 1')!);
    await waitForRows(['Bench press', 'Cable fly', 'Curl']);

    await startReplace('Curl', 'Incline dumbbell press');
    const update = within(openDialog()!).getByLabelText(/Update the workout/) as HTMLInputElement;
    expect(update.disabled).toBe(true);
    expect(openDialog()!.textContent).toMatch(/added today/);
    fireEvent.click(dialogButton('Replace')!);
    await waitForTitle('Incline dumbbell press');
    fireEvent.click(screen.getByRole('link', { name: /Workout/ }));
    await waitForRows(['Bench press', 'Cable fly', 'Incline dumbbell press']);
  });

  it('Cancel in the confirmation changes nothing', async () => {
    renderSession();
    await startReplace('Bench press', 'Incline dumbbell press');
    fireEvent.click(dialogButton('Cancel')!);
    await waitFor(() => expect(openDialog()).toBeNull());
    expect(title()).toBe('Bench press');
    expect((await getDraft(db, sessionId))!.items.map((i) => i.exerciseId)).toEqual([
      bench.id,
      fly.id,
    ]);
  });

  it('the pick list leaves out exercises already in the session and archived ones', async () => {
    renderSession();
    await openExercise('Bench press');
    fireEvent.click(screen.getByLabelText('More actions for Bench press'));
    await waitForDialog();
    fireEvent.click(dialogButton('Replace with another exercise…')!);
    await waitFor(() => expect(openDialog()?.textContent).toMatch('Replace Bench press with…'));
    const offered = [...openDialog()!.querySelectorAll('.list__title')].map((e) => e.textContent);
    expect(offered).toEqual(expect.arrayContaining(['Incline dumbbell press', 'Curl']));
    expect(offered).not.toContain('Bench press');
    expect(offered).not.toContain('Cable fly');
  });
});
