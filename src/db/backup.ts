import { localDateString } from '../domain/date';
import { newId } from '../domain/id';
import { WORKOUT_ICONS } from '../domain/types';
import { assertValidSetValues } from '../domain/set-values';
import type {
  DraftItem,
  DraftRow,
  Exercise,
  Session,
  SessionDraft,
  SessionSet,
  Workout,
  WorkoutIcon,
} from '../domain/types';
import type { LiftDB } from './schema';
import { STARTER_EXERCISES, SEEDED_KEY } from './seed';

/**
 * JSON backup. `formatVersion` changes when the shape of `data` changes in a way an older
 * reader could not understand. Drafts are not included: they are working state, not history.
 *
 * - 1: first format. Workouts have no `archived` flag.
 * - 2: workouts have `archived`. Format 1 files are still read (archived = false).
 * - 3: workouts have `icon`. Older files are still read (icon = 'generic'); an unknown icon
 *   value also becomes 'generic'.
 *
 * The app writes the latest version and reads every version listed in READABLE_VERSIONS.
 */
export const BACKUP_APP = 'lift';
export const BACKUP_FORMAT_VERSION = 3;
const READABLE_VERSIONS: readonly number[] = [1, 2, 3];

const LAST_EXPORT_KEY = 'lastExportAt';
export const BACKUP_REMINDER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BackupData {
  exercises: Exercise[];
  workouts: Workout[];
  sessions: Session[];
  sets: SessionSet[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  formatVersion: number;
  /** Epoch ms. */
  exportedAt: number;
  data: BackupData;
}

export interface BackupSummary {
  exercises: number;
  workouts: number;
  sessions: number;
  sets: number;
}

export type BackupErrorCode =
  'not-json' | 'not-a-backup' | 'unsupported-version' | 'invalid-structure';

export type BackupParseResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: BackupErrorCode; detail?: string; version?: number };

// ---------------------------------------------------------------- export

export async function exportBackup(db: LiftDB, now: number = Date.now()): Promise<BackupFile> {
  // One read transaction, so the four tables are a consistent snapshot.
  const data = await db.transaction(
    'r',
    db.exercises,
    db.workouts,
    db.sessions,
    db.sets,
    async () => ({
      exercises: await db.exercises.toArray(),
      workouts: await db.workouts.toArray(),
      sessions: await db.sessions.toArray(),
      sets: await db.sets.toArray(),
    }),
  );
  return { app: BACKUP_APP, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now, data };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** lift-backup-2026-10-14.json, with the local date. */
export function backupFileName(now: number = Date.now()): string {
  return `lift-backup-${localDateString(now)}.json`;
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const { exercises, workouts, sessions, sets } = backup.data;
  return {
    exercises: exercises.length,
    workouts: workouts.length,
    sessions: sessions.length,
    sets: sets.length,
  };
}

// ------------------------------------------------------------ validation

class Invalid extends Error {}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(path: string, expected: string): never {
  throw new Invalid(`${path}: expected ${expected}`);
}

function str(v: unknown, path: string): string {
  if (typeof v !== 'string' || v.trim() === '') fail(path, 'a non-empty string');
  return v;
}

function finite(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'a number');
  return v;
}

function int(v: unknown, path: string, min: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min) {
    fail(path, `a whole number >= ${min}`);
  }
  return v;
}

function list(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, 'a list');
  return v;
}

function record(v: unknown, path: string): Record<string, unknown> {
  if (!isRecord(v)) fail(path, 'an object');
  return v;
}

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function uniqueIds(items: { id: string }[], path: string): void {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (seen.has(item.id)) fail(`${path}[${i}].id`, 'a unique id');
    seen.add(item.id);
  });
}

function readExercise(raw: unknown, path: string): Exercise {
  const r = record(raw, path);
  if (typeof r.archived !== 'boolean') fail(`${path}.archived`, 'true or false');
  return {
    id: str(r.id, `${path}.id`),
    name: str(r.name, `${path}.name`),
    stepGrams: int(r.stepGrams, `${path}.stepGrams`, 1),
    archived: r.archived,
  };
}

/** Missing or unknown icons fall back to the generic one instead of rejecting the file. */
function readIcon(v: unknown): WorkoutIcon {
  return (WORKOUT_ICONS as readonly unknown[]).includes(v) ? (v as WorkoutIcon) : 'generic';
}

function readWorkout(raw: unknown, path: string, formatVersion: number): Workout {
  const r = record(raw, path);
  let archived = false; // format 1 has no archived workouts
  if (formatVersion >= 2) {
    if (typeof r.archived !== 'boolean') fail(`${path}.archived`, 'true or false');
    archived = r.archived;
  }
  return {
    id: str(r.id, `${path}.id`),
    name: str(r.name, `${path}.name`),
    exerciseIds: list(r.exerciseIds, `${path}.exerciseIds`).map((id, i) =>
      str(id, `${path}.exerciseIds[${i}]`),
    ),
    archived,
    icon: readIcon(r.icon),
  };
}

function readSession(raw: unknown, path: string): Session {
  const r = record(raw, path);
  const date = str(r.date, `${path}.date`);
  if (!isRealDate(date)) fail(`${path}.date`, 'a date like 2026-10-14');
  return {
    id: str(r.id, `${path}.id`),
    workoutId: str(r.workoutId, `${path}.workoutId`),
    date,
    startedAt: finite(r.startedAt, `${path}.startedAt`),
    finishedAt: r.finishedAt === null ? null : finite(r.finishedAt, `${path}.finishedAt`),
  };
}

function readSet(raw: unknown, path: string): SessionSet {
  const r = record(raw, path);
  const weightGrams = finite(r.weightGrams, `${path}.weightGrams`);
  const reps = finite(r.reps, `${path}.reps`);
  try {
    assertValidSetValues(weightGrams, reps);
  } catch {
    fail(`${path}`, 'weight in whole grams (0 to 10000 kg) and reps from 1 to 100');
  }
  return {
    id: str(r.id, `${path}.id`),
    sessionId: str(r.sessionId, `${path}.sessionId`),
    exerciseId: str(r.exerciseId, `${path}.exerciseId`),
    order: int(r.order, `${path}.order`, 0),
    weightGrams,
    reps,
    createdAt: finite(r.createdAt, `${path}.createdAt`),
  };
}

function readData(raw: unknown, formatVersion: number): BackupData {
  const data = record(raw, 'data');
  const exercises = list(data.exercises, 'data.exercises').map((v, i) =>
    readExercise(v, `data.exercises[${i}]`),
  );
  const workouts = list(data.workouts, 'data.workouts').map((v, i) =>
    readWorkout(v, `data.workouts[${i}]`, formatVersion),
  );
  const sessions = list(data.sessions, 'data.sessions').map((v, i) =>
    readSession(v, `data.sessions[${i}]`),
  );
  const sets = list(data.sets, 'data.sets').map((v, i) => readSet(v, `data.sets[${i}]`));

  uniqueIds(exercises, 'data.exercises');
  uniqueIds(workouts, 'data.workouts');
  uniqueIds(sessions, 'data.sessions');
  uniqueIds(sets, 'data.sets');

  const exerciseIds = new Set(exercises.map((e) => e.id));
  const sessionIds = new Set(sessions.map((s) => s.id));
  workouts.forEach((w, i) =>
    w.exerciseIds.forEach((id, j) => {
      if (!exerciseIds.has(id))
        fail(`data.workouts[${i}].exerciseIds[${j}]`, 'an existing exercise');
    }),
  );
  sets.forEach((s, i) => {
    if (!sessionIds.has(s.sessionId)) fail(`data.sets[${i}].sessionId`, 'an existing session');
    if (!exerciseIds.has(s.exerciseId)) fail(`data.sets[${i}].exerciseId`, 'an existing exercise');
  });
  if (sessions.filter((s) => s.finishedAt === null).length > 1) {
    fail('data.sessions', 'at most one active session');
  }
  return { exercises, workouts, sessions, sets };
}

/** Checks an already parsed value. Nothing here touches the database. */
export function validateBackup(raw: unknown): BackupParseResult {
  if (!isRecord(raw) || raw.app !== BACKUP_APP || typeof raw.formatVersion !== 'number') {
    return { ok: false, error: 'not-a-backup' };
  }
  if (!READABLE_VERSIONS.includes(raw.formatVersion)) {
    return { ok: false, error: 'unsupported-version', version: raw.formatVersion };
  }
  try {
    const backup: BackupFile = {
      app: BACKUP_APP,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: finite(raw.exportedAt, 'exportedAt'),
      data: readData(raw.data, raw.formatVersion),
    };
    return { ok: true, backup };
  } catch (error) {
    if (error instanceof Invalid)
      return { ok: false, error: 'invalid-structure', detail: error.message };
    throw error;
  }
}

export function parseBackupText(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  return validateBackup(raw);
}

// ---------------------------------------------------------------- import

/**
 * An active session in a backup has no draft (drafts are not exported). Rebuild a minimal one
 * from its checked sets so the user lands back in a working session instead of a broken one.
 */
function rebuildDraft(session: Session, data: BackupData, now: number): SessionDraft {
  const routineIds = new Set(
    data.workouts.find((w) => w.id === session.workoutId)?.exerciseIds ?? [],
  );
  const mine = data.sets
    .filter((s) => s.sessionId === session.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const items = new Map<string, DraftItem>();
  for (const set of mine) {
    let item = items.get(set.exerciseId);
    if (!item) {
      item = {
        exerciseId: set.exerciseId,
        origin: routineIds.has(set.exerciseId) ? 'routine' : 'added',
        replacesExerciseId: null,
        skipped: false,
        rows: [],
      };
      items.set(set.exerciseId, item);
    }
    const row: DraftRow = {
      id: newId(),
      weightGrams: set.weightGrams,
      reps: set.reps,
      checkedSetId: set.id,
    };
    item.rows.push(row);
  }
  return { sessionId: session.id, items: [...items.values()], updatedAt: now };
}

/**
 * Replaces everything with the backup, in one transaction: it either completes or leaves the
 * database as it was. `backup` must come from `validateBackup`/`parseBackupText`.
 */
export async function importBackup(
  db: LiftDB,
  backup: BackupFile,
  now: number = Date.now(),
): Promise<BackupSummary> {
  const { data } = backup;
  await db.transaction(
    'rw',
    [db.exercises, db.workouts, db.sessions, db.sets, db.drafts, db.meta],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.sessions.clear(),
        db.sets.clear(),
        db.drafts.clear(),
      ]);
      await db.exercises.bulkAdd(data.exercises);
      await db.workouts.bulkAdd(data.workouts);
      await db.sessions.bulkAdd(data.sessions);
      await db.sets.bulkAdd(data.sets);
      const active = data.sessions.find((s) => s.finishedAt === null);
      if (active) await db.drafts.add(rebuildDraft(active, data, now));
      // The restored exercise list is the user's; the starter list must not load again.
      await db.meta.put({ key: SEEDED_KEY, value: true });
    },
  );
  return summarizeBackup(backup);
}

// ------------------------------------------------- state and reminders

/** True if wiping the database would lose something the user made or changed. */
export async function hasUserData(db: LiftDB): Promise<boolean> {
  const [sessions, sets, workouts, exercises] = await Promise.all([
    db.sessions.count(),
    db.sets.count(),
    db.workouts.count(),
    db.exercises.toArray(),
  ]);
  if (sessions + sets + workouts > 0) return true;
  const starters = new Map(STARTER_EXERCISES.map((e) => [e.id, e]));
  return exercises.some((e) => {
    const starter = starters.get(e.id);
    return (
      !starter ||
      starter.name !== e.name ||
      starter.stepGrams !== e.stepGrams ||
      starter.archived !== e.archived
    );
  });
}

export async function recordExport(db: LiftDB, now: number = Date.now()): Promise<void> {
  await db.meta.put({ key: LAST_EXPORT_KEY, value: now });
}

export async function getLastExportAt(db: LiftDB): Promise<number | null> {
  const entry = await db.meta.get(LAST_EXPORT_KEY);
  return typeof entry?.value === 'number' ? entry.value : null;
}

/**
 * True when the last export is 30+ days old. If there was never an export, the clock starts at
 * the oldest data; with no data there is nothing to back up and no reminder.
 */
export function isBackupReminderDue(
  lastExportAt: number | null,
  oldestDataAt: number | null,
  now: number,
): boolean {
  const since = lastExportAt ?? oldestDataAt;
  return since !== null && now - since >= BACKUP_REMINDER_DAYS * DAY_MS;
}

export async function getBackupStatus(
  db: LiftDB,
  now: number = Date.now(),
): Promise<{ lastExportAt: number | null; reminderDue: boolean }> {
  const lastExportAt = await getLastExportAt(db);
  const [sessions, sets] = await Promise.all([db.sessions.toArray(), db.sets.toArray()]);
  const times = [...sessions.map((s) => s.startedAt), ...sets.map((s) => s.createdAt)];
  const oldestDataAt = times.length > 0 ? Math.min(...times) : null;
  return { lastExportAt, reminderDue: isBackupReminderDue(lastExportAt, oldestDataAt, now) };
}
