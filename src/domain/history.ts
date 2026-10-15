import { localTimeString } from './date';
import type { Session, SessionSet } from './types';
import { formatWeight } from './weight';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Newest first: by date, then by finish time, then by start time. Does not change the input. */
export function sortNewestFirst(sessions: readonly Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.finishedAt ?? 0) - (a.finishedAt ?? 0) || b.startedAt - a.startedAt;
  });
}

export interface MonthGroup {
  /** "2026-10" */
  key: string;
  /** "October 2026" */
  label: string;
  sessions: Session[];
}

/** "2026-10" -> "October 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : key;
}

/** Groups sessions (already newest first) by calendar month, keeping their order. */
export function groupSessionsByMonth(sessions: readonly Session[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const session of sessions) {
    const key = session.date.slice(0, 7);
    const last = groups.at(-1);
    if (last && last.key === key) last.sessions.push(session);
    else groups.push({ key, label: monthLabel(key), sessions: [session] });
  }
  return groups;
}

export interface SessionSummary {
  exercises: number;
  sets: number;
}

/** How many different exercises and sets a session holds, from its sets. */
export function summarizeSessionSets(sets: readonly SessionSet[]): SessionSummary {
  return { exercises: new Set(sets.map((s) => s.exerciseId)).size, sets: sets.length };
}

export interface ExerciseSets {
  exerciseId: string;
  sets: SessionSet[];
}

const bySetOrder = (a: SessionSet, b: SessionSet) =>
  a.order - b.order || a.createdAt - b.createdAt || a.id.localeCompare(b.id);

/**
 * The exercises of one finished session, in the order their first set was checked, each with its
 * sets in their planned order. (The planned exercise order is not kept after Finish.)
 */
export function orderExercisesInSession(sets: readonly SessionSet[]): ExerciseSets[] {
  const groups = new Map<string, SessionSet[]>();
  for (const set of sets) {
    const group = groups.get(set.exerciseId);
    if (group) group.push(set);
    else groups.set(set.exerciseId, [set]);
  }
  const firstChecked = (group: SessionSet[]) => Math.min(...group.map((s) => s.createdAt));
  return [...groups.entries()]
    .map(([exerciseId, group]) => ({ exerciseId, sets: [...group].sort(bySetOrder) }))
    .sort(
      (a, b) =>
        firstChecked(a.sets) - firstChecked(b.sets) || a.exerciseId.localeCompare(b.exerciseId),
    );
}

export interface ExerciseHistoryEntry {
  session: Session;
  sets: SessionSet[];
}

/** The finished sessions in which `exerciseId` has sets, newest first, with those sets. */
export function sessionsForExercise(
  exerciseId: string,
  sessions: readonly Session[],
  sets: readonly SessionSet[],
): ExerciseHistoryEntry[] {
  const mine = new Map<string, SessionSet[]>();
  for (const set of sets) {
    if (set.exerciseId !== exerciseId) continue;
    const group = mine.get(set.sessionId);
    if (group) group.push(set);
    else mine.set(set.sessionId, [set]);
  }
  const finished = sessions.filter((s) => s.finishedAt !== null && mine.has(s.id));
  return sortNewestFirst(finished).map((session) => ({
    session,
    sets: [...mine.get(session.id)!].sort(bySetOrder),
  }));
}

/** "80 kg × 5" */
export function formatSetLine(set: Pick<SessionSet, 'weightGrams' | 'reps'>): string {
  return `${formatWeight(set.weightGrams)} kg × ${set.reps}`;
}

/** "80×5, 82.5×4": a compact line for lists. */
export function formatSetsInline(
  sets: readonly Pick<SessionSet, 'weightGrams' | 'reps'>[],
): string {
  return sets.map((s) => `${formatWeight(s.weightGrams)}×${s.reps}`).join(', ');
}

/** "18:05 – 19:12", or just the start for a session that has no end. */
export function sessionTimeRange(session: Pick<Session, 'startedAt' | 'finishedAt'>): string {
  const start = localTimeString(session.startedAt);
  return session.finishedAt === null ? start : `${start} – ${localTimeString(session.finishedAt)}`;
}
