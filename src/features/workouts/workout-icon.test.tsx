// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '../../test/jsdom-dialog';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '../../db/instance';
import { createWorkout, getWorkout } from '../../db/repo/workouts';
import { WorkoutEditorScreen } from './WorkoutEditorScreen';

afterEach(async () => {
  cleanup();
  db.close();
  await db.delete();
  await db.open();
});

describe('workout icon picker', () => {
  it('offers five labelled choices, generic selected by default, and saves the pick', async () => {
    const w = await createWorkout(db, 'Push');
    render(
      <MemoryRouter initialEntries={[`/workouts/${w.id}`]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutEditorScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    const group = await screen.findByRole('radiogroup', { name: 'Icon' });
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Generic',
      'Push',
      'Pull',
      'Legs',
      'Full body',
    ]);
    expect(screen.getByRole('radio', { name: 'Generic' }).getAttribute('aria-checked')).toBe(
      'true',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Legs' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Legs' }).getAttribute('aria-checked')).toBe('true'),
    );
    expect(screen.getByRole('radio', { name: 'Generic' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect((await getWorkout(db, w.id))?.icon).toBe('legs');
  });
});
