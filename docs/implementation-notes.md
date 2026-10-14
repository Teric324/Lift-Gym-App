# Implementation notes

Decisions and reminders that do not belong in the product spec. Keep it short.

## Data model (src/db)

- Tables: `exercises`, `workouts`, `sessions`, `sets`, `drafts`, `meta`.
- `sets` holds **checked sets only**. Each has `createdAt`; editing a set keeps it, so "the oldest
  set stays the record" still holds after an edit.
- PR is never stored. It is computed from `sets` (`domain/pr.ts`), so edits and deletes are
  always reflected.
- Ids are string UUIDs from `newId()` (`crypto.randomUUID()`, with a `getRandomValues()` fallback
  because `randomUUID` is missing on plain `http://192.168.x.x`).
- Session `date` is the **local** calendar day (`localDateString`), never `toISOString()`.
- Starter exercises use fixed ids (`seed:bench-press`, ...) so two machines that each seed their
  own database still agree on ids when a JSON backup is imported. Seeding runs once, tracked by
  the `exercisesSeeded` flag in `meta`.
- Archiving an exercise is a flag. Its sets, history and PR are untouched.

## Active session and draft

- At most one session is active (`finishedAt === null`). `startSession` throws
  `ActiveSessionExistsError` if there is one.
- The draft (`drafts`) stores the active session's exercise order and which exercises were
  added, replaced or skipped. It is created with the session, deleted when it is finished or
  deleted. It does not hold unchecked set values.

### TODO for the session screen (step 9): stale active session

`prefill` ignores unfinished sessions. If the user opens the app and an active session from an
**earlier day** still exists (forgot to tap finish), starting a new session would be blocked and
prefill would not see those sets.

The UI must handle it explicitly when starting a session:

1. Detect it: `getActiveSession()` returns a session whose `date` is before today's local date.
2. Ask the user whether to finish it. Finishing keeps its checked sets and makes them count for
   history, PR and prefill.
3. Only then start the new session. Never finish or delete the old one silently.

Related: an active session with no checked sets can be offered as "discard" instead of "finish".
