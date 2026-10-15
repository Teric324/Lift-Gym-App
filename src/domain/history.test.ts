import { describe, expect, it } from 'vitest';
import {
  formatSetLine,
  formatSetsInline,
  groupSessionsByMonth,
  monthLabel,
  orderExercisesInSession,
  sessionTimeRange,
  sessionsForExercise,
  sortNewestFirst,
  summarizeSessionSets,
} from './history';
import type { Session, SessionSet } from './types';

const session = (id: string, date: string, over: Partial<Session> = {}): Session => ({
  id,
  workoutId: 'w1',
  date,
  startedAt: Date.parse(`${date}T10:00:00Z`),
  finishedAt: Date.parse(`${date}T11:00:00Z`),
  ...over,
});

let n = 0;
const set = (
  sessionId: string,
  exerciseId: string,
  kg: number,
  reps: number,
  over: Partial<SessionSet> = {},
): SessionSet => ({
  id: `s${++n}`,
  sessionId,
  exerciseId,
  order: 0,
  weightGrams: kg * 1000,
  reps,
  createdAt: n,
  ...over,
});

describe('sortNewestFirst', () => {
  it('orders by date, then finish time, then start time, and keeps the input', () => {
    const a = session('a', '2026-10-12');
    const b = session('b', '2026-10-14', { finishedAt: 100 });
    const c = session('c', '2026-10-14', { finishedAt: 200 });
    const d = session('d', '2026-09-30');
    const input = [a, b, c, d];
    expect(sortNewestFirst(input).map((s) => s.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(input.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('monthLabel and groupSessionsByMonth', () => {
  it('names the month in English', () => {
    expect(monthLabel('2026-10')).toBe('October 2026');
    expect(monthLabel('2026-01')).toBe('January 2026');
    expect(monthLabel('bad')).toBe('bad');
  });

  it('groups consecutive sessions by month and keeps the order', () => {
    const sessions = [
      session('a', '2026-10-14'),
      session('b', '2026-10-02'),
      session('c', '2026-09-30'),
      session('d', '2025-12-31'),
    ];
    const groups = groupSessionsByMonth(sessions);
    expect(groups.map((g) => [g.key, g.label, g.sessions.map((s) => s.id)])).toEqual([
      ['2026-10', 'October 2026', ['a', 'b']],
      ['2026-09', 'September 2026', ['c']],
      ['2025-12', 'December 2025', ['d']],
    ]);
  });

  it('is empty for no sessions', () => {
    expect(groupSessionsByMonth([])).toEqual([]);
  });
});

describe('summarizeSessionSets', () => {
  it('counts distinct exercises and all sets', () => {
    const sets = [set('s', 'bench', 80, 5), set('s', 'bench', 82.5, 4), set('s', 'fly', 25, 12)];
    expect(summarizeSessionSets(sets)).toEqual({ exercises: 2, sets: 3 });
    expect(summarizeSessionSets([])).toEqual({ exercises: 0, sets: 0 });
  });
});

describe('orderExercisesInSession', () => {
  it('orders exercises by their first checked set and sets by their planned order', () => {
    const sets = [
      set('s', 'fly', 25, 12, { createdAt: 50, order: 0 }),
      set('s', 'bench', 82.5, 4, { createdAt: 30, order: 1 }),
      set('s', 'bench', 80, 5, { createdAt: 20, order: 0 }),
      set('s', 'fly', 25, 10, { createdAt: 60, order: 1 }),
    ];
    const result = orderExercisesInSession(sets);
    expect(result.map((r) => r.exerciseId)).toEqual(['bench', 'fly']);
    expect(result[0]!.sets.map((s) => s.reps)).toEqual([5, 4]);
    expect(result[1]!.sets.map((s) => s.reps)).toEqual([12, 10]);
  });

  it('puts sets checked out of order back in their planned order', () => {
    const sets = [
      set('s', 'bench', 85, 3, { order: 2, createdAt: 10 }),
      set('s', 'bench', 80, 5, { order: 0, createdAt: 20 }),
      set('s', 'bench', 82.5, 4, { order: 1, createdAt: 30 }),
    ];
    expect(orderExercisesInSession(sets)[0]!.sets.map((s) => s.weightGrams)).toEqual([
      80000, 82500, 85000,
    ]);
  });

  it('is empty without sets', () => {
    expect(orderExercisesInSession([])).toEqual([]);
  });
});

describe('sessionsForExercise', () => {
  const sessions = [
    session('old', '2026-10-01'),
    session('new', '2026-10-12'),
    session('other', '2026-10-05'),
    session('active', '2026-10-14', { finishedAt: null }),
  ];
  const sets = [
    set('old', 'bench', 70, 8),
    set('new', 'bench', 82.5, 4, { order: 1 }),
    set('new', 'bench', 80, 5, { order: 0 }),
    set('other', 'fly', 20, 12),
    set('active', 'bench', 90, 1),
  ];

  it('lists finished sessions with that exercise, newest first, sets in order', () => {
    const history = sessionsForExercise('bench', sessions, sets);
    expect(history.map((h) => h.session.id)).toEqual(['new', 'old']);
    expect(history[0]!.sets.map((s) => s.weightGrams)).toEqual([80000, 82500]);
  });

  it('leaves out the active session and other exercises', () => {
    expect(
      sessionsForExercise('bench', sessions, sets).some((h) => h.session.id === 'active'),
    ).toBe(false);
    expect(sessionsForExercise('fly', sessions, sets).map((h) => h.session.id)).toEqual(['other']);
  });

  it('is empty for an exercise never done', () => {
    expect(sessionsForExercise('squat', sessions, sets)).toEqual([]);
  });
});

describe('formatting', () => {
  it('formats a set and a list of sets', () => {
    expect(formatSetLine({ weightGrams: 82500, reps: 4 })).toBe('82.5 kg × 4');
    expect(formatSetLine({ weightGrams: 0, reps: 12 })).toBe('0 kg × 12');
    expect(
      formatSetsInline([
        { weightGrams: 80000, reps: 5 },
        { weightGrams: 27250, reps: 8 },
      ]),
    ).toBe('80×5, 27.25×8');
    expect(formatSetsInline([])).toBe('');
  });

  it('formats the time range, with or without an end', () => {
    const start = new Date(2026, 9, 12, 18, 5).getTime();
    const end = new Date(2026, 9, 12, 19, 12).getTime();
    expect(sessionTimeRange({ startedAt: start, finishedAt: end })).toBe('18:05 – 19:12');
    expect(sessionTimeRange({ startedAt: start, finishedAt: null })).toBe('18:05');
  });
});
