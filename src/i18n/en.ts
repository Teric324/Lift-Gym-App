// All user-facing UI strings live here so another language can be added later.
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const en = {
  appName: 'Lift',
  tagline: 'Your workout tracker',

  nav: { label: 'Main', home: 'Home', settings: 'Settings' },
  home: {
    title: 'Workouts',
    placeholder: 'Your workouts will appear here.',
  },
  update: {
    available: 'Update available',
    afterWorkout: 'An update is ready. It will install after your workout, on the next start.',
  },

  settings: {
    title: 'Settings',
    loading: 'Loading…',
    backupHeading: 'Backup',
    backupIntro:
      'Your data lives only on this phone. Export a backup file regularly and keep it in Files or iCloud Drive.',
    exportButton: 'Export backup',
    exportLink: 'Download backup',
    exportPreparing: 'Preparing backup…',
    exportShareTitle: 'Lift backup',
    exportDone: 'Backup saved.',
    exportFailed: 'The backup could not be shared. Use the download link instead.',
    lastBackupNever: 'No backup yet.',
    lastBackup: (date: string, days: number) =>
      days === 0
        ? `Last backup: today (${date}).`
        : `Last backup: ${days === 1 ? 'yesterday' : `${days} days ago`} (${date}).`,
    reminder: (days: number | null) =>
      days === null
        ? 'You have not exported a backup yet. Export one now.'
        : `It has been ${days} days since your last backup. Export a new one.`,

    storageHeading: 'Storage',
    storage: {
      granted: 'Protected: the browser will not clear this data on its own.',
      denied:
        'Not guaranteed: the browser may clear this data if the phone runs low on space or the app is unused for a while. Export a backup regularly.',
      unsupported:
        'This browser cannot protect the data from being cleared. Export a backup regularly.',
      unknown: 'Storage protection has not been checked yet.',
    },

    importHeading: 'Restore from a backup',
    importIntro: 'Importing replaces all data on this phone with the contents of the file.',
    importButton: 'Choose backup file…',
    importReading: 'Reading file…',
    importConfirmHeading: 'Replace all data with this backup?',
    importSummary: (c: { exercises: number; workouts: number; sessions: number; sets: number }) =>
      [
        count(c.exercises, 'exercise'),
        count(c.workouts, 'workout'),
        count(c.sessions, 'session'),
        count(c.sets, 'set'),
      ].join(', '),
    importExportedOn: (date: string) => `Backup made on ${date}.`,
    importHasData:
      'This phone already has data. A backup of it will be saved first, then it will be replaced.',
    importHasDataLink:
      'This phone already has data. Save a copy of it with the link below first, then replace it.',
    importSaveCurrent: 'Save current data first',
    importConfirm: 'Replace my data',
    importCancel: 'Cancel',
    importCancelled: 'Nothing was changed.',
    importAbortedNoBackup: 'The backup of your current data was not saved, so nothing was changed.',
    importDone: (summary: string) => `Backup restored: ${summary}.`,
    importFailed: 'The import failed and nothing was changed.',

    backupError: {
      notJson: 'This file is not a valid backup: it is not readable JSON or it is incomplete.',
      notABackup: 'This file is not a Lift backup.',
      unsupportedVersion: (version: number) =>
        `This backup uses format version ${version}, which this version of the app does not know. Update the app and try again.`,
      invalidStructure: (detail: string) =>
        `This backup file is damaged or was edited by hand. Nothing was imported. (${detail})`,
    },
  },
} as const;
