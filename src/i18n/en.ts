// All user-facing UI strings live here so another language can be added later.
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const en = {
  appName: 'Lift',
  tagline: 'Your workout tracker',

  common: {
    cancel: 'Cancel',
    save: 'Save',
    add: 'Add',
    archive: 'Archive',
    restore: 'Restore',
    remove: 'Remove',
    archivedTag: 'Archived',
    nameRequired: 'Enter a name.',
  },

  nav: { label: 'Main', home: 'Workouts', exercises: 'Exercises', settings: 'Settings' },

  workouts: {
    title: 'Workouts',
    intro: 'A workout is a reusable routine. Each time you train it, a new session is recorded.',
    add: 'New workout',
    addTitle: 'New workout',
    nameLabel: 'Workout name',
    empty: 'No workouts yet. Create your first one, for example "Push".',
    archivedHeading: (n: number) => `Archived (${n})`,
    exerciseCount: (n: number) => (n === 1 ? '1 exercise' : `${n} exercises`),
    notFound: 'This workout does not exist.',
    back: 'Back to workouts',
    rename: 'Rename',
    renameTitle: 'Rename workout',
    archiveTitle: 'Archive this workout?',
    archiveBody:
      'It will be hidden from the list. Past sessions keep it, and you can restore it any time.',
    archivedNote: 'Archived. Restore it to use it again.',
    exercisesHeading: 'Exercises',
    emptyExercises: 'This workout has no exercises yet.',
    addExercises: 'Add exercises',
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    removeExercise: (name: string) => `Remove ${name}`,
    archivedExercise: 'Archived exercise: left out of new sessions',
    picker: {
      title: 'Add exercises',
      searchLabel: 'Search or type a new name',
      none: 'No exercises to add.',
      create: (name: string) => `Create "${name}"`,
      confirm: (n: number) => (n === 0 ? 'Add' : `Add ${n}`),
      allAdded: 'Every exercise is already in this workout.',
    },
  },

  exercises: {
    title: 'Exercises',
    intro: 'Every exercise exists once. History and records belong to the exercise.',
    add: 'Add exercise',
    addTitle: 'New exercise',
    nameLabel: 'Name',
    searchLabel: 'Search',
    searchPlaceholder: 'Search exercises',
    empty: 'No exercises yet. Add your first one.',
    noMatches: 'No exercise matches your search.',
    archivedHeading: (n: number) => `Archived (${n})`,
    step: (kg: string) => `Step ${kg} kg`,
    nameTaken: (name: string) => `An exercise named "${name}" already exists.`,
    restoreTitle: 'Restore this exercise?',
    restoreBody: (name: string) =>
      `"${name}" is archived. Restore it with its history and records?`,
    notFound: 'This exercise does not exist.',
    back: 'Back to exercises',
    rename: 'Rename',
    renameTitle: 'Rename exercise',
    stepHeading: 'Weight step',
    stepHelp: 'The weight picker counts in this step.',
    stepCustom: 'Custom step (kg)',
    stepSet: 'Set step',
    stepPreview: (list: string) => `Picker: ${list} …`,
    stepError: {
      empty: 'Enter a step in kg.',
      invalid: 'Enter a number like 2.5 or 1,25.',
      negative: 'The step cannot be negative.',
      'too-many-decimals': 'Use at most 2 decimals.',
      'too-large': 'That step is too large.',
      zero: 'The step must be more than 0.',
      'too-small': 'The smallest step is 0.01 kg.',
      'too-big': 'The largest step is 100 kg.',
    },
    usedIn: (names: string[]) =>
      names.length === 0 ? 'Not used in any workout.' : `Used in: ${names.join(', ')}.`,
    setsLogged: (n: number) => (n === 1 ? '1 set logged.' : `${n} sets logged.`),
    archiveTitle: 'Archive this exercise?',
    archiveBody: (inWorkouts: number) =>
      inWorkouts === 0
        ? 'It will be hidden from pickers. Its history and records stay.'
        : `It will be hidden from pickers and left out of new sessions of the ${inWorkouts} workout(s) that use it. Its history and records stay, and you can restore it any time.`,
    archivedNote: 'Archived. Its history and records are kept.',
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
