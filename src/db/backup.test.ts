import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backupFileName,
  exportBackup,
  getBackupStatus,
  getLastExportAt,
  hasUserData,
  importBackup,
  isBackupReminderDue,
  parseBackupText,
  recordExport,
  serializeBackup,
  summarizeBackup,
  validateBackup,
  type BackupFile,
} from './backup';
import type { Workout } from '../domain/types';
import { getDraft } from './repo/drafts';
import { addExercise, listExercises, renameExercise } from './repo/exercises';
import { finishSession, getActiveSession, startSession } from './repo/sessions';
import { addSet, listAllSets } from './repo/sets';
import { createWorkout } from './repo/workouts';
import { LiftDB } from './schema';
import { seedStarterExercises } from './seed';
import { checkDraftRow } from './repo/drafts';

let db: LiftDB;
let counter = 0;
const opened: LiftDB[] = [];

function freshDb(): LiftDB {
  const d = new LiftDB(`lift-backup-test-${++counter}`);
  opened.push(d);
  return d;
}

beforeEach(() => {
  db = freshDb();
});

afterEach(async () => {
  await Promise.all(opened.splice(0).map((d) => d.delete()));
});

const T0 = new Date(2026, 9, 5, 18, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

function validBackup(): BackupFile {
  return {
    app: 'lift',
    formatVersion: 3,
    exportedAt: T0,
    data: {
      exercises: [
        { id: 'e1', name: 'Bench press', stepGrams: 2500, archived: false },
        { id: 'e2', name: 'Dips', stepGrams: 1000, archived: true },
      ],
      workouts: [
        { id: 'w1', name: 'Push', exerciseIds: ['e1', 'e2'], archived: false, icon: 'push' },
      ],
      sessions: [
        { id: 's1', workoutId: 'w1', date: '2026-10-05', startedAt: T0, finishedAt: T0 + 3600000 },
      ],
      sets: [
        {
          id: 'x1',
          sessionId: 's1',
          exerciseId: 'e1',
          order: 0,
          weightGrams: 27250,
          reps: 8,
          createdAt: T0 + 1000,
        },
      ],
    },
  };
}

/** A populated database with a finished session and checked sets. */
async function populate(target: LiftDB) {
  await seedStarterExercises(target);
  const bench = await addExercise(target, 'Cable crunch', 1250);
  const w = await createWorkout(target, 'Abs', [bench.id, 'seed:dips']);
  const { session } = await startSession(target, w.id, T0);
  await addSet(
    target,
    { sessionId: session.id, exerciseId: bench.id, weightGrams: 27250, reps: 12 },
    T0 + 1,
  );
  await addSet(
    target,
    { sessionId: session.id, exerciseId: 'seed:dips', weightGrams: 0, reps: 9 },
    T0 + 2,
  );
  await finishSession(target, session.id, T0 + 5);
  return { bench, w, session };
}

describe('validateBackup / parseBackupText: accepted', () => {
  it('accepts a valid file', () => {
    const result = parseBackupText(JSON.stringify(validBackup()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(summarizeBackup(result.backup)).toEqual({
        exercises: 2,
        workouts: 1,
        sessions: 1,
        sets: 1,
      });
    }
  });

  it('drops unknown extra fields instead of storing them', () => {
    const raw = JSON.parse(JSON.stringify(validBackup()));
    raw.data.exercises[0].secret = 'x';
    raw.somethingElse = 1;
    const result = validateBackup(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.data.exercises[0]).not.toHaveProperty('secret');
  });

  it('accepts an empty backup', () => {
    const raw = { ...validBackup(), data: { exercises: [], workouts: [], sessions: [], sets: [] } };
    expect(validateBackup(raw).ok).toBe(true);
  });
});

describe('validateBackup / parseBackupText: rejected', () => {
  it('rejects text that is not JSON, including a truncated file', () => {
    expect(parseBackupText('not json at all')).toEqual({ ok: false, error: 'not-json' });
    expect(parseBackupText('')).toEqual({ ok: false, error: 'not-json' });
    const text = JSON.stringify(validBackup());
    expect(parseBackupText(text.slice(0, text.length - 20))).toEqual({
      ok: false,
      error: 'not-json',
    });
  });

  it('rejects JSON that is not a Lift backup', () => {
    for (const raw of [
      [],
      'text',
      42,
      null,
      {},
      { formatVersion: 1 },
      { app: 'other', formatVersion: 1 },
    ]) {
      expect(validateBackup(raw)).toEqual({ ok: false, error: 'not-a-backup' });
    }
    expect(validateBackup({ app: 'lift' })).toEqual({ ok: false, error: 'not-a-backup' });
  });

  it('rejects an unknown formatVersion and reports it', () => {
    expect(validateBackup({ ...validBackup(), formatVersion: 4 })).toEqual({
      ok: false,
      error: 'unsupported-version',
      version: 4,
    });
    expect(validateBackup({ ...validBackup(), formatVersion: 0 })).toMatchObject({
      error: 'unsupported-version',
    });
  });

  it.each([
    ['missing data', (b: BackupFile) => delete (b as Partial<BackupFile>).data],
    [
      'sets not a list',
      (b: BackupFile) => ((b.data as unknown as Record<string, unknown>).sets = {}),
    ],
    ['zero reps', (b: BackupFile) => (b.data.sets[0]!.reps = 0)],
    ['reps above 100', (b: BackupFile) => (b.data.sets[0]!.reps = 101)],
    ['negative weight', (b: BackupFile) => (b.data.sets[0]!.weightGrams = -1)],
    ['fractional grams', (b: BackupFile) => (b.data.sets[0]!.weightGrams = 27.5)],
    [
      'weight as text',
      (b: BackupFile) =>
        ((b.data.sets[0] as unknown as Record<string, unknown>).weightGrams = '27250'),
    ],
    ['set for unknown exercise', (b: BackupFile) => (b.data.sets[0]!.exerciseId = 'nope')],
    ['set for unknown session', (b: BackupFile) => (b.data.sets[0]!.sessionId = 'nope')],
    [
      'workout with unknown exercise',
      (b: BackupFile) => b.data.workouts[0]!.exerciseIds.push('nope'),
    ],
    ['duplicate exercise id', (b: BackupFile) => (b.data.exercises[1]!.id = 'e1')],
    ['impossible date', (b: BackupFile) => (b.data.sessions[0]!.date = '2026-02-31')],
    ['date in wrong format', (b: BackupFile) => (b.data.sessions[0]!.date = '14/10/2026')],
    ['empty exercise name', (b: BackupFile) => (b.data.exercises[0]!.name = '  ')],
    ['zero step', (b: BackupFile) => (b.data.exercises[0]!.stepGrams = 0)],
    [
      'workout archived missing (format 2)',
      (b: BackupFile) => delete (b.data.workouts[0] as Partial<Workout>).archived,
    ],
    [
      'workout archived not boolean',
      (b: BackupFile) =>
        ((b.data.workouts[0] as unknown as Record<string, unknown>).archived = 'yes'),
    ],
    [
      'archived not boolean',
      (b: BackupFile) =>
        ((b.data.exercises[0] as unknown as Record<string, unknown>).archived = 'no'),
    ],
    [
      'two active sessions',
      (b: BackupFile) => {
        b.data.sessions[0]!.finishedAt = null;
        b.data.sessions.push({
          id: 's2',
          workoutId: 'w1',
          date: '2026-10-06',
          startedAt: T0,
          finishedAt: null,
        });
      },
    ],
  ])('rejects invalid structure: %s', (_name, mutate) => {
    const backup = validBackup();
    mutate(backup);
    const result = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(result).toMatchObject({ ok: false, error: 'invalid-structure' });
    if (!result.ok) expect(result.detail).toBeTruthy();
  });

  it('says where the problem is', () => {
    const backup = validBackup();
    backup.data.sets[0]!.reps = 0;
    const result = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(result).toMatchObject({ ok: false, detail: expect.stringContaining('data.sets[0]') });
  });
});

describe('format versions', () => {
  it('still reads a format 1 file (no archived on workouts): workouts come back active', async () => {
    const v1 = JSON.parse(JSON.stringify(validBackup()));
    v1.formatVersion = 1;
    for (const w of v1.data.workouts) {
      delete w.archived;
      delete w.icon;
    }
    const parsed = validateBackup(v1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.data.workouts[0]).toMatchObject({ id: 'w1', archived: false });

    await importBackup(db, parsed.backup);
    const exported = await exportBackup(db, T0);
    expect(exported.formatVersion).toBe(3);
    expect(exported.data.workouts).toEqual([
      { id: 'w1', name: 'Push', exerciseIds: ['e1', 'e2'], archived: false, icon: 'generic' },
    ]);
  });

  it('ignores an archived flag in a format 1 file (the format never had one)', () => {
    const v1 = JSON.parse(JSON.stringify(validBackup()));
    v1.formatVersion = 1;
    v1.data.workouts[0].archived = true;
    const parsed = validateBackup(v1);
    expect(parsed.ok && parsed.backup.data.workouts[0]?.archived).toBe(false);
  });

  it('archived workouts survive export -> import', async () => {
    const backup = validBackup();
    backup.data.workouts.push({
      id: 'w2',
      name: 'Old routine',
      exerciseIds: ['e1'],
      archived: true,
      icon: 'legs',
    });
    await importBackup(db, backup);
    const text = serializeBackup(await exportBackup(db, T0));
    const parsed = parseBackupText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const other = freshDb();
    await importBackup(other, parsed.backup);
    const workouts = (await exportBackup(other, T0)).data.workouts;
    expect(workouts.find((w) => w.id === 'w2')?.archived).toBe(true);
    expect(workouts.find((w) => w.id === 'w1')?.archived).toBe(false);
  });

  it('a session of an archived workout keeps its workout', async () => {
    const backup = validBackup();
    backup.data.workouts[0]!.archived = true;
    await importBackup(db, backup);
    const exported = await exportBackup(db, T0);
    const session = exported.data.sessions[0]!;
    expect(exported.data.workouts.find((w) => w.id === session.workoutId)).toBeDefined();
  });
});

describe('workout icons in backups', () => {
  it('keeps the icon through export -> text -> import', async () => {
    const backup = validBackup();
    backup.data.workouts[0]!.icon = 'pull';
    await importBackup(db, backup);
    const parsed = parseBackupText(serializeBackup(await exportBackup(db, T0)));
    expect(parsed.ok && parsed.backup.data.workouts[0]?.icon).toBe('pull');
  });

  it('reads a format 2 file (no icon) and gives workouts the generic icon', async () => {
    const v2 = JSON.parse(JSON.stringify(validBackup()));
    v2.formatVersion = 2;
    for (const w of v2.data.workouts) delete w.icon;
    const parsed = validateBackup(v2);
    expect(parsed.ok && parsed.backup.data.workouts[0]?.icon).toBe('generic');
    if (!parsed.ok) return;
    await importBackup(db, parsed.backup);
    expect((await exportBackup(db, T0)).data.workouts[0]?.icon).toBe('generic');
  });

  it.each([['skateboard'], [42], [null]])('falls back to generic for the icon %j', (bad) => {
    const raw = JSON.parse(JSON.stringify(validBackup()));
    raw.data.workouts[0].icon = bad;
    const parsed = validateBackup(raw);
    expect(parsed.ok && parsed.backup.data.workouts[0]?.icon).toBe('generic');
  });
});

describe('export and import', () => {
  it('round trip: export -> text -> parse -> import into a fresh database -> same data', async () => {
    await populate(db);
    const exported = await exportBackup(db, T0 + 10 * DAY);
    const parsed = parseBackupText(serializeBackup(exported));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const other = freshDb();
    const summary = await importBackup(other, parsed.backup);
    expect(summary).toEqual(summarizeBackup(exported));

    const again = await exportBackup(other, T0 + 10 * DAY);
    const sortById = <T extends { id: string }>(items: T[]) =>
      [...items].sort((a, b) => a.id.localeCompare(b.id));
    expect(sortById(again.data.exercises)).toEqual(sortById(exported.data.exercises));
    expect(sortById(again.data.workouts)).toEqual(sortById(exported.data.workouts));
    expect(sortById(again.data.sessions)).toEqual(sortById(exported.data.sessions));
    expect(sortById(again.data.sets)).toEqual(sortById(exported.data.sets));
    expect(exported.data.sets.find((s) => s.weightGrams === 27250)).toBeDefined();
  });

  it('the export holds exercises, workouts, sessions and sets, and no drafts', async () => {
    await populate(db);
    const w = await createWorkout(db, 'Another', ['seed:dips']);
    await startSession(db, w.id, T0 + DAY); // active session with a draft
    const exported = await exportBackup(db, T0 + 2 * DAY);
    expect(Object.keys(exported.data).sort()).toEqual([
      'exercises',
      'sessions',
      'sets',
      'workouts',
    ]);
    expect(exported).toMatchObject({ app: 'lift', formatVersion: 3, exportedAt: T0 + 2 * DAY });
    expect(JSON.stringify(exported)).not.toContain('checkedSetId');
  });

  it('import replaces everything, including old data and drafts', async () => {
    await populate(db);
    const w = await createWorkout(db, 'Old', ['seed:dips']);
    const { session } = await startSession(db, w.id, T0 + DAY);

    await importBackup(db, validBackup());

    const exercises = await listExercises(db, { includeArchived: true });
    expect(exercises.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
    expect(await listAllSets(db)).toHaveLength(1);
    expect(await getActiveSession(db)).toBeUndefined();
    expect(await getDraft(db, session.id)).toBeUndefined();
  });

  it('marks the starter list as loaded so it does not come back after an import', async () => {
    await importBackup(db, validBackup());
    expect(await seedStarterExercises(db)).toBe(false);
    expect((await listExercises(db, { includeArchived: true })).map((e) => e.id).sort()).toEqual([
      'e1',
      'e2',
    ]);
  });

  it('a failing import changes nothing (single transaction)', async () => {
    await populate(db);
    const before = await exportBackup(db, T0);

    const broken = validBackup();
    broken.data.sets.push({ ...broken.data.sets[0]! }); // duplicate primary key, bypassing validation
    await expect(importBackup(db, broken)).rejects.toThrow();

    const after = await exportBackup(db, T0);
    expect(after).toEqual(before);
    expect(await seedStarterExercises(db)).toBe(false);
  });

  it('an active session in the backup comes back with a usable draft', async () => {
    const backup = validBackup();
    backup.data.sessions[0]!.finishedAt = null;
    backup.data.sets.push({
      id: 'x2',
      sessionId: 's1',
      exerciseId: 'e2',
      order: 0,
      weightGrams: 0,
      reps: 7,
      createdAt: T0 + 2000,
    });
    const parsed = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await importBackup(db, parsed.backup, T0 + 9);

    const active = await getActiveSession(db);
    expect(active?.id).toBe('s1');
    const draft = await getDraft(db, 's1');
    expect(draft?.items.map((i) => [i.exerciseId, i.origin, i.rows.length])).toEqual([
      ['e1', 'routine', 1],
      ['e2', 'routine', 1],
    ]);
    expect(draft?.items[0]?.rows[0]).toMatchObject({
      checkedSetId: 'x1',
      weightGrams: 27250,
      reps: 8,
    });
  });

  it('keeps working after an import: start a session and check a set', async () => {
    await importBackup(db, validBackup());
    const { session, draft } = await startSession(db, 'w1', T0 + DAY);
    expect(draft.items[0]!.rows).toMatchObject([
      { weightGrams: 27250, reps: 8, checkedSetId: null },
    ]);
    const set = await checkDraftRow(
      db,
      session.id,
      'e1',
      draft.items[0]!.rows[0]!.id,
      T0 + DAY + 1,
    );
    expect(set.weightGrams).toBe(27250);
  });
});

describe('file name', () => {
  it('contains the local date', () => {
    expect(backupFileName(new Date(2026, 9, 14, 0, 30).getTime())).toBe(
      'lift-backup-2026-10-14.json',
    );
    expect(backupFileName(new Date(2026, 0, 5, 23, 59).getTime())).toBe(
      'lift-backup-2026-01-05.json',
    );
  });
});

describe('hasUserData', () => {
  it('is false for an empty or freshly seeded database', async () => {
    expect(await hasUserData(db)).toBe(false);
    await seedStarterExercises(db);
    expect(await hasUserData(db)).toBe(false);
  });

  it('is true once the user changes or adds anything', async () => {
    await seedStarterExercises(db);
    await renameExercise(db, 'seed:dips', 'Parallel bar dips');
    expect(await hasUserData(db)).toBe(true);

    const other = freshDb();
    await seedStarterExercises(other);
    await addExercise(other, 'My own');
    expect(await hasUserData(other)).toBe(true);

    const third = freshDb();
    await populate(third);
    expect(await hasUserData(third)).toBe(true);
  });
});

describe('backup reminder', () => {
  it('is due after 30 days since the last export', () => {
    expect(isBackupReminderDue(T0, null, T0 + 29 * DAY)).toBe(false);
    expect(isBackupReminderDue(T0, null, T0 + 30 * DAY)).toBe(true);
    expect(isBackupReminderDue(T0, T0 - 100 * DAY, T0 + 31 * DAY)).toBe(true);
  });

  it('never exported: counts from the oldest data; no data, no reminder', () => {
    expect(isBackupReminderDue(null, T0, T0 + 10 * DAY)).toBe(false);
    expect(isBackupReminderDue(null, T0, T0 + 30 * DAY)).toBe(true);
    expect(isBackupReminderDue(null, null, T0 + 365 * DAY)).toBe(false);
  });

  it('getBackupStatus reads the last export and the oldest data from the database', async () => {
    expect(await getBackupStatus(db, T0)).toEqual({ lastExportAt: null, reminderDue: false });

    await populate(db);
    expect(await getLastExportAt(db)).toBeNull();
    expect((await getBackupStatus(db, T0 + 40 * DAY)).reminderDue).toBe(true);

    await recordExport(db, T0 + 39 * DAY);
    expect(await getBackupStatus(db, T0 + 40 * DAY)).toEqual({
      lastExportAt: T0 + 39 * DAY,
      reminderDue: false,
    });
    expect((await getBackupStatus(db, T0 + 70 * DAY)).reminderDue).toBe(true);
  });
});
