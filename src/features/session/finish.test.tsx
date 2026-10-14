// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { addDraftRow, checkDraftRow, getDraft } from '../../db/repo/drafts';
import { addExercise } from '../../db/repo/exercises';
import {
  finishSession,
  getActiveSession,
  listSessions,
  startSession,
} from '../../db/repo/sessions';
import { addSet, listAllSets } from '../../db/repo/sets';
import { createWorkout } from '../../db/repo/workouts';
import type { Exercise, Session, SessionDraft } from '../../domain/types';
import { FinishBar, countRows } from './FinishBar';

const T0 = new Date(2026, 9, 5, 18, 0).getTime();

let exercise: Exercise;
let session: Session;
let draft: SessionDraft;

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderBar(current: SessionDraft = draft) {
  render(
    <MemoryRouter initialEntries={['/session']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <FinishBar sessionId={session.id} draft={current} />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;
/** A button of the dialog that is open (both dialogs are always in the DOM). */
const openDialogButton = (name: string) =>
  [...document.querySelectorAll('dialog[open] button')].find(
    (b) => b.textContent?.trim() === name,
  ) as HTMLButtonElement;
const dialogOpen = () => waitFor(() => expect(document.querySelector('dialog[open]')).toBeTruthy());

beforeEach(async () => {
  exercise = await addExercise(db, 'Bench press');
  const workout = await createWorkout(db, 'Push', [exercise.id]);
  // An earlier finished session gives today's session one pre-filled row.
  const prev = await startSession(db, workout.id, T0 - 86_400_000);
  await addSet(
    db,
    { sessionId: prev.session.id, exerciseId: exercise.id, weightGrams: 80000, reps: 5 },
    T0 - 86_400_000,
  );
  await finishSession(db, prev.session.id, T0 - 86_000_000);
  const started = await startSession(db, workout.id, T0);
  session = started.session;
  draft = started.draft;
});

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

describe('countRows', () => {
  it('counts checked and unchecked rows of visible exercises only', () => {
    const rows = (...checked: boolean[]) =>
      checked.map((c, i) => ({
        id: `r${i}`,
        weightGrams: 1000,
        reps: 5,
        checkedSetId: c ? `s${i}` : null,
      }));
    const base = { exerciseId: 'e', origin: 'routine' as const, replacesExerciseId: null };
    expect(
      countRows({
        sessionId: 's',
        updatedAt: 0,
        items: [
          { ...base, skipped: false, rows: rows(true, false, true) },
          { ...base, exerciseId: 'f', skipped: true, rows: rows(false, false) },
        ],
      }),
    ).toEqual({ checked: 2, unchecked: 1 });
  });
});

describe('FinishBar', () => {
  it('with nothing checked it offers Discard, not Finish, and discards after confirmation', async () => {
    renderBar();
    expect(screen.queryByText('Finish workout')).toBeNull();
    fireEvent.click(screen.getByText('Discard workout'));
    await dialogOpen();
    expect(await getActiveSession(db)).toBeDefined();

    fireEvent.click(openDialogButton('Discard'));
    await waitFor(() => expect(where()).toBe('/'));
    expect(await getActiveSession(db)).toBeUndefined();
    expect((await listSessions(db)).map((s) => s.id)).not.toContain(session.id);
  });

  it('with unchecked rows left, Finish asks first; cancelling changes nothing', async () => {
    const first = draft.items[0]!.rows[0];
    expect(first).toBeDefined();
    await checkDraftRow(db, session.id, exercise.id, first!.id, T0 + 1000);
    const extra = await addDraftRow(db, session.id, exercise.id);
    expect(extra.checkedSetId).toBeNull();
    const current = (await getDraft(db, session.id))!;

    renderBar(current);
    fireEvent.click(screen.getByText('Finish workout'));
    await dialogOpen();
    expect(screen.getByText('1 set is not checked and will not be saved.')).toBeTruthy();

    fireEvent.click(openDialogButton('Cancel'));
    expect(where()).toBe('/session');
    expect((await getActiveSession(db))?.id).toBe(session.id);
    expect(await listAllSets(db)).toHaveLength(2); // the earlier session's set + today's
  });

  it('Finish anyway ends the session, keeps checked sets and drops the draft', async () => {
    await checkDraftRow(db, session.id, exercise.id, draft.items[0]!.rows[0]!.id, T0 + 1000);
    await addDraftRow(db, session.id, exercise.id);
    renderBar((await getDraft(db, session.id))!);

    fireEvent.click(screen.getByText('Finish workout'));
    await dialogOpen();
    fireEvent.click(openDialogButton('Finish anyway'));

    await waitFor(() => expect(where()).toBe('/'));
    expect(await getActiveSession(db)).toBeUndefined();
    expect(await getDraft(db, session.id)).toBeUndefined();
    const finished = (await listSessions(db)).find((s) => s.id === session.id);
    expect(finished?.finishedAt).not.toBeNull();
    const todays = (await listAllSets(db)).filter((s) => s.sessionId === session.id);
    expect(todays).toHaveLength(1);
  });

  it('with every row checked, Finish ends the session without a question', async () => {
    await checkDraftRow(db, session.id, exercise.id, draft.items[0]!.rows[0]!.id, T0 + 1000);
    renderBar((await getDraft(db, session.id))!);

    fireEvent.click(screen.getByText('Finish workout'));
    await waitFor(() => expect(where()).toBe('/'));
    expect(await getActiveSession(db)).toBeUndefined();
  });
});
