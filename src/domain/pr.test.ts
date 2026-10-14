import { describe, expect, it } from 'vitest';
import { beats, getAllPRs, getPR, isNewPR } from './pr';
import type { SessionSet } from './types';

let nextId = 0;
const set = (
  exerciseId: string,
  kg: number,
  reps: number,
  createdAt = ++nextId,
  extra: Partial<SessionSet> = {},
): SessionSet => ({
  id: `s${++nextId}`,
  sessionId: 'sess',
  exerciseId,
  order: 0,
  weightGrams: kg * 1000,
  reps,
  createdAt,
  ...extra,
});

describe('beats', () => {
  it('5x150 beats 1x150', () => {
    expect(beats({ weightGrams: 150000, reps: 5 }, { weightGrams: 150000, reps: 1 })).toBe(true);
    expect(beats({ weightGrams: 150000, reps: 1 }, { weightGrams: 150000, reps: 5 })).toBe(false);
  });

  it('150x5 beats 100x12 (weight first)', () => {
    expect(beats({ weightGrams: 150000, reps: 5 }, { weightGrams: 100000, reps: 12 })).toBe(true);
    expect(beats({ weightGrams: 100000, reps: 12 }, { weightGrams: 150000, reps: 5 })).toBe(false);
  });

  it('identical sets do not beat each other', () => {
    expect(beats({ weightGrams: 80000, reps: 8 }, { weightGrams: 80000, reps: 8 })).toBe(false);
  });
});

describe('getPR', () => {
  it('is null without sets', () => {
    expect(getPR('bench', [])).toBeNull();
  });

  it('picks heavier weight, then more reps', () => {
    const sets = [set('leg', 100, 12), set('leg', 150, 1), set('leg', 150, 5), set('leg', 140, 20)];
    const pr = getPR('leg', sets);
    expect(pr).toMatchObject({ weightGrams: 150000, reps: 5 });
  });

  it('bodyweight (0 kg): only reps decide', () => {
    const sets = [set('pullup', 0, 8), set('pullup', 0, 12), set('pullup', 0, 10)];
    expect(getPR('pullup', sets)).toMatchObject({ weightGrams: 0, reps: 12 });
  });

  it('identical sets: the oldest stays the record', () => {
    const oldest = set('bench', 100, 5, 1000);
    const newer = set('bench', 100, 5, 2000);
    expect(getPR('bench', [newer, oldest])?.id).toBe(oldest.id);
    expect(getPR('bench', [oldest, newer])?.id).toBe(oldest.id);
  });

  it('is not influenced by other exercises', () => {
    const sets = [set('bench', 100, 5), set('squat', 200, 10)];
    expect(getPR('bench', sets)).toMatchObject({ exerciseId: 'bench', weightGrams: 100000 });
    expect(getPR('curl', sets)).toBeNull();
  });

  it('deleting the record set drops the PR to the next best', () => {
    const record = set('bench', 120, 3);
    const next = set('bench', 110, 5);
    const other = set('bench', 100, 10);
    const all = [other, record, next];
    expect(getPR('bench', all)?.id).toBe(record.id);
    const afterDelete = all.filter((s) => s.id !== record.id);
    expect(getPR('bench', afterDelete)?.id).toBe(next.id);
  });

  it('editing the record set recalculates the PR', () => {
    const record = set('bench', 120, 3);
    const other = set('bench', 110, 5);
    const lowered = { ...record, weightGrams: 105000 };
    expect(getPR('bench', [lowered, other])?.id).toBe(other.id);
    const raised = { ...other, weightGrams: 125000 };
    expect(getPR('bench', [record, raised])?.id).toBe(other.id);
  });

  it('keeps the PR for an exercise that is archived (sets are all that matter)', () => {
    // Archiving lives on the Exercise, not on its sets, so history and PR are untouched.
    const sets = [set('old-machine', 90, 6), set('old-machine', 95, 4)];
    expect(getPR('old-machine', sets)).toMatchObject({ weightGrams: 95000, reps: 4 });
  });
});

describe('getAllPRs', () => {
  it('gives one PR per exercise', () => {
    const sets = [set('bench', 100, 5), set('bench', 110, 3), set('squat', 150, 5)];
    const prs = getAllPRs(sets);
    expect([...prs.keys()].sort()).toEqual(['bench', 'squat']);
    expect(prs.get('bench')).toMatchObject({ weightGrams: 110000 });
    expect(prs.get('squat')).toMatchObject({ weightGrams: 150000 });
  });
});

describe('isNewPR', () => {
  it('first set of an exercise without history is a new PR', () => {
    expect(isNewPR(set('bench', 60, 8), [])).toBe(true);
    expect(isNewPR(set('bench', 60, 8), [set('squat', 200, 10)])).toBe(true);
  });

  it('is true only when strictly better', () => {
    const history = [set('bench', 100, 5)];
    expect(isNewPR(set('bench', 100, 6), history)).toBe(true);
    expect(isNewPR(set('bench', 105, 1), history)).toBe(true);
    expect(isNewPR(set('bench', 100, 5), history)).toBe(false);
    expect(isNewPR(set('bench', 100, 4), history)).toBe(false);
    expect(isNewPR(set('bench', 90, 20), history)).toBe(false);
  });

  it('ignores the set itself if it is already in the existing sets', () => {
    const record = set('bench', 100, 5);
    const other = set('bench', 90, 8);
    expect(isNewPR(record, [other, record])).toBe(true);
    expect(isNewPR(other, [other, record])).toBe(false);
  });

  it('ignores sets of other exercises', () => {
    expect(isNewPR(set('bench', 50, 5), [set('squat', 200, 5)])).toBe(true);
  });
});
