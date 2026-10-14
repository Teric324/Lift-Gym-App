import { describe, expect, it } from 'vitest';
import { endTimeForSession, isStaleSession } from './session-state';
import type { Session, SessionSet } from './types';

const session = (over: Partial<Session> = {}): Session => ({
  id: 's1',
  workoutId: 'w1',
  date: '2026-10-12',
  startedAt: 1000,
  finishedAt: null,
  ...over,
});

const set = (sessionId: string, createdAt: number): SessionSet => ({
  id: `x${createdAt}`,
  sessionId,
  exerciseId: 'e1',
  order: 0,
  weightGrams: 1000,
  reps: 5,
  createdAt,
});

describe('isStaleSession', () => {
  it('is true for an active session from an earlier day', () => {
    expect(isStaleSession(session({ date: '2026-10-12' }), '2026-10-14')).toBe(true);
  });

  it('is false for today and for finished sessions', () => {
    expect(isStaleSession(session({ date: '2026-10-14' }), '2026-10-14')).toBe(false);
    expect(isStaleSession(session({ date: '2026-10-12', finishedAt: 5 }), '2026-10-14')).toBe(
      false,
    );
  });

  it('compares dates across month and year boundaries', () => {
    expect(isStaleSession(session({ date: '2026-09-30' }), '2026-10-01')).toBe(true);
    expect(isStaleSession(session({ date: '2025-12-31' }), '2026-01-01')).toBe(true);
  });
});

describe('endTimeForSession', () => {
  it('is the last checked set of that session', () => {
    const sets = [set('s1', 3000), set('s1', 9000), set('s1', 5000), set('other', 99999)];
    expect(endTimeForSession(session(), sets)).toBe(9000);
  });

  it('falls back to the start when there are no sets', () => {
    expect(endTimeForSession(session({ startedAt: 1234 }), [set('other', 5)])).toBe(1234);
    expect(endTimeForSession(session({ startedAt: 1234 }), [])).toBe(1234);
  });
});
