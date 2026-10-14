import { describe, expect, it } from 'vitest';
import { prefillForExercises } from './prefill';
import type { Session, SessionSet } from './types';

const session = (
  id: string,
  date: string,
  finishedAt: number | null,
  workoutId = 'push',
): Session => ({
  id,
  workoutId,
  date,
  startedAt: finishedAt === null ? 1 : finishedAt - 1,
  finishedAt,
});

let n = 0;
const set = (
  sessionId: string,
  exerciseId: string,
  kg: number,
  reps: number,
  order: number,
): SessionSet => ({
  id: `set${++n}`,
  sessionId,
  exerciseId,
  order,
  weightGrams: kg * 1000,
  reps,
  createdAt: n,
});

describe('prefillForExercises', () => {
  it('returns the last session sets of the exercise, in order, as weight + reps', () => {
    const sessions = [session('a', '2026-10-05', 100), session('b', '2026-10-12', 200)];
    const sets = [
      set('a', 'bench', 60, 10, 0),
      set('b', 'bench', 70, 8, 1),
      set('b', 'bench', 65, 8, 0),
      set('b', 'bench', 72.5, 6, 2),
    ];
    expect(prefillForExercises(['bench'], sessions, sets).get('bench')).toEqual([
      { weightGrams: 65000, reps: 8 },
      { weightGrams: 70000, reps: 8 },
      { weightGrams: 72500, reps: 6 },
    ]);
  });

  it('exercise without history gets an empty list', () => {
    const sessions = [session('a', '2026-10-05', 100)];
    const sets = [set('a', 'bench', 60, 10, 0)];
    const result = prefillForExercises(['bench', 'new-one'], sessions, sets);
    expect(result.get('new-one')).toEqual([]);
    expect(prefillForExercises(['x'], [], []).get('x')).toEqual([]);
  });

  it('Bench on Monday, Incline on Tuesday: a Monday-style routine prefills Bench from Monday', () => {
    const sessions = [
      session('mon', '2026-10-12', 100, 'push-monday'),
      session('tue', '2026-10-13', 200, 'push-tuesday'),
    ];
    const sets = [set('mon', 'bench', 80, 5, 0), set('tue', 'incline', 30, 10, 0)];
    const result = prefillForExercises(['bench'], sessions, sets);
    expect(result.get('bench')).toEqual([{ weightGrams: 80000, reps: 5 }]);
  });

  it('replacing Bench with Incline prefills Incline from its own last session, any workout', () => {
    const sessions = [
      session('mon', '2026-10-12', 100, 'push-monday'),
      session('tue', '2026-10-13', 200, 'pull-tuesday'),
    ];
    const sets = [set('mon', 'bench', 80, 5, 0), set('tue', 'incline', 30, 10, 0)];
    const result = prefillForExercises(['incline'], sessions, sets);
    expect(result.get('incline')).toEqual([{ weightGrams: 30000, reps: 10 }]);
  });

  it('uses the most recent session that actually has sets of that exercise', () => {
    const sessions = [session('a', '2026-10-05', 100), session('b', '2026-10-12', 200)];
    const sets = [set('a', 'bench', 60, 10, 0), set('b', 'squat', 100, 5, 0)];
    expect(prefillForExercises(['bench'], sessions, sets).get('bench')).toEqual([
      { weightGrams: 60000, reps: 10 },
    ]);
  });

  it('decides "last" by date, not by insertion or finish time order', () => {
    // Session b is the later date even though it finished (was edited/entered) earlier.
    const sessions = [session('a', '2026-10-05', 9999), session('b', '2026-10-12', 100)];
    const sets = [set('a', 'bench', 60, 10, 0), set('b', 'bench', 70, 8, 0)];
    expect(prefillForExercises(['bench'], sessions, sets).get('bench')).toEqual([
      { weightGrams: 70000, reps: 8 },
    ]);
  });

  it('same day: the session finished later wins', () => {
    const sessions = [
      session('morning', '2026-10-12', 1000),
      session('evening', '2026-10-12', 5000),
    ];
    const sets = [set('morning', 'bench', 60, 10, 0), set('evening', 'bench', 62.5, 9, 0)];
    expect(prefillForExercises(['bench'], sessions, sets).get('bench')).toEqual([
      { weightGrams: 62500, reps: 9 },
    ]);
    expect(
      prefillForExercises(['bench'], [...sessions].reverse(), [...sets].reverse()).get('bench'),
    ).toEqual([{ weightGrams: 62500, reps: 9 }]);
  });

  it('ignores the active (unfinished) session', () => {
    const sessions = [session('done', '2026-10-05', 100), session('active', '2026-10-14', null)];
    const sets = [set('done', 'bench', 60, 10, 0), set('active', 'bench', 90, 3, 0)];
    expect(prefillForExercises(['bench'], sessions, sets).get('bench')).toEqual([
      { weightGrams: 60000, reps: 10 },
    ]);
    // Only an active session exists: no history yet.
    expect(
      prefillForExercises(
        ['bench'],
        [session('active', '2026-10-14', null)],
        [set('active', 'bench', 90, 3, 0)],
      ).get('bench'),
    ).toEqual([]);
  });

  it('handles several exercises at once, each with its own last session', () => {
    const sessions = [session('a', '2026-10-05', 100), session('b', '2026-10-12', 200)];
    const sets = [
      set('a', 'bench', 60, 10, 0),
      set('a', 'squat', 100, 5, 0),
      set('b', 'bench', 65, 8, 0),
    ];
    const result = prefillForExercises(['bench', 'squat'], sessions, sets);
    expect(result.get('bench')).toEqual([{ weightGrams: 65000, reps: 8 }]);
    expect(result.get('squat')).toEqual([{ weightGrams: 100000, reps: 5 }]);
  });

  it('an archived exercise keeps its history (archiving is not part of the lookup)', () => {
    // Archived flag lives on Exercise; prefill depends only on sets and sessions.
    const sessions = [session('a', '2026-10-05', 100)];
    const sets = [set('a', 'old-machine', 90, 6, 0)];
    expect(prefillForExercises(['old-machine'], sessions, sets).get('old-machine')).toEqual([
      { weightGrams: 90000, reps: 6 },
    ]);
  });
});
