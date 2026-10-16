# Progress and next steps

Last updated: 2026-10-16 (drag-to-reorder everywhere, typed weights, plain-letter titles, app-style links).

Live app: https://lift-tracker-dwa.pages.dev (Cloudflare Pages, deploys on every push to `main`).
Latest commit at the time of writing: see `git log`.

## Done

| Step | What | Tested on iPhone |
|---|---|---|
| 1 | Scaffold: Vite, React, TypeScript, ESLint, Prettier, Vitest | n/a |
| 2 | `domain/weight`: parse, format (integer grams) | n/a |
| 3 | PR (best set), prefill per exercise, types | n/a |
| 4 | Dexie schema, repos, starter exercises, `newId`, `localDateString` | n/a |
| 5 | JSON export/import, Settings, backup reminder | yes |
| 6 | PWA, offline, update button, persistent storage, deploy | yes |
| 7 | Exercise registry and workouts UI, schema v2 (`Workout.archived`), backup format 2 | yes |
| 8 | Workout session: start, prefill, check sets, finish/discard, stale session dialog | yes |
| 9 | Weight picker (step list, +10/+25 jumps, free typing, iOS keyboard sizing); replaced by a typed input in step 15 | yes |
| 10 | Freedom in the session: add, move, skip, bring back, replace | yes |
| 11 | History: list by month, one workout (edit, delete), history per exercise | yes |
| D1 | New look, stage 1: tokens, Inter and Black Ops One shipped and precached | yes (seen on the phone) |
| D2 | New look, stage 2: bottom navigation, wordmark, flat icon | **not yet** |
| 13 | Icon per workout (5 choices), schema v3 (`Workout.icon`), backup format 3 | **not yet** (checklist section 15) |
| 14 | Workout screen in two levels: compact overview with drag-to-reorder, one screen per exercise (`/session/:exerciseId`), swipe-left to delete a set, plain numeric reps (no − / +), no schema change | **not yet** (checklist section 16) |
| 15 | Drag-to-reorder everywhere (`src/ui/drag`, routine editor, no ↑/↓ buttons); weights typed inline (no step, no picker, no jump buttons); page titles without diacritics (`DisplayTitle`, `plainLetters`); links styled like the app (`BackLink`, no underline); History editor without reps - / + | **not yet** (checklist section 17) |

The new look is being applied in stages (see `docs/design/README.md`). Stages 1 (tokens, fonts, restyled
buttons, fields, lists, dialogs) and 2 (wordmark, bottom navigation, flat icon) are built; the
iPhone test of stage 2 is `docs/iphone-checklist.md`, section 14.

## Next

- **New look, stages 3 to 5** (workout screen and weight sheet; the other screens; polish). Approved mockups and a clickable prototype are in
  `docs/design/`.
- **Step 12: profile.** Every exercise with its PR (best set: heavier weight, then more reps),
  "New PR" badge when a set strictly beats the record.
- **Then a separate design pass** (colours, layout, finish). Notes are in `docs/design-notes.md`.

## Decisions already made (do not re-ask)

- PR rule: heaviest weight, then more reps; an identical set does not beat the oldest one.
- Weight in integer grams; 0 kg is valid; reps 1 to 100; warning "Are you sure?" above 500 kg, no
  blocking. Weight is free typing with `.` or `,`.
- The per-exercise step and the picker's jump buttons (+10 / +25) were removed at the user's
  request (2026-10-16): users type 12.4 or 27.3 directly. `Exercise.stepGrams` is still stored
  (schema and backup unchanged) but unused.
- Drag handle is the only way to reorder, everywhere (no ↑ / ↓ buttons). Titles in the display
  font are shown without diacritics. No link looks like a default HTML link.
- Exercises and workouts are archived, never deleted.
- One active session. A forgotten session from an earlier day is never finished or deleted
  silently; it ends at its last checked set.
- Unchecked rows live only in the draft and never count for history or PR.
- Dexie: never edit an existing `version()` block; add a new one with an upgrade.
- UI text is English, in `src/i18n/en.ts`. Styling is simple CSS with classes and variables.

## Ways of working

- Before writing code in a new area: propose structure, behaviour, edge cases and order of work,
  then wait for approval (CLAUDE.md).
- Small commits; pull before starting, push when done (two machines: Windows PC and MacBook).
- Every step ends with an exact list of what to test on the iPhone, also written to
  `docs/iphone-checklist.md`.
- The user replies in Romanian; the app and the docs are in English.

## Practical notes

- `npm install`, then `npm run dev` (port 5173). Checks: `npm test`, `npm run lint`,
  `npx tsc --noEmit`, `npm run build`.
- Component tests use jsdom (`// @vitest-environment jsdom`); `src/test/jsdom-dialog.ts` stands in
  for `<dialog>.showModal`. Dialogs are always in the DOM, so tests wait for `dialog[open]`.
- Git identity is set locally in the repo (`Claude <noreply@anthropic.com>`), not globally.
- On this Windows machine, very large shell heredocs sometimes fail; write big files with the file
  tools instead.
