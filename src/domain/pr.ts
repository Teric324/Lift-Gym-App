import type { SessionSet } from './types';

type Performance = Pick<SessionSet, 'weightGrams' | 'reps'>;

/** Heavier wins; at equal weight more reps win. Identical sets do not beat each other. */
export function beats(a: Performance, b: Performance): boolean {
  if (a.weightGrams !== b.weightGrams) return a.weightGrams > b.weightGrams;
  return a.reps > b.reps;
}

/**
 * The PR of one exercise: its best set. On identical sets the oldest one stays the record.
 * Only sets of `exerciseId` are considered. Recomputed from scratch, so passing the sets
 * after an edit or delete gives the correct PR.
 */
export function getPR(exerciseId: string, sets: readonly SessionSet[]): SessionSet | null {
  let best: SessionSet | null = null;
  for (const set of oldestFirst(sets)) {
    if (set.exerciseId !== exerciseId) continue;
    if (best === null || beats(set, best)) best = set;
  }
  return best;
}

/** PR per exercise id, for every exercise that has at least one set. */
export function getAllPRs(sets: readonly SessionSet[]): Map<string, SessionSet> {
  const prs = new Map<string, SessionSet>();
  for (const set of oldestFirst(sets)) {
    const best = prs.get(set.exerciseId);
    if (best === undefined || beats(set, best)) prs.set(set.exerciseId, set);
  }
  return prs;
}

/**
 * True only if `set` strictly beats the existing record of its exercise. With no history the
 * first set is a new PR. `existingSets` may contain `set` itself; it is ignored.
 */
export function isNewPR(set: SessionSet, existingSets: readonly SessionSet[]): boolean {
  const record = getPR(
    set.exerciseId,
    existingSets.filter((s) => s.id !== set.id),
  );
  return record === null || beats(set, record);
}

function oldestFirst(sets: readonly SessionSet[]): SessionSet[] {
  // Array.prototype.sort is stable, so equal createdAt keeps the input order.
  return [...sets].sort((a, b) => a.createdAt - b.createdAt);
}
