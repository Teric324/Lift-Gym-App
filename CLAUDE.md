# Lift — Gym Tracker (PWA)

A fast, intuitive workout **tracker**. The user logs exercises, sets, weight and reps, and can
look back at history. **No recommendations, no progression algorithms, no auto-prescribed
weights.** The app records; the user decides.

Platform: web app / PWA used from the phone browser (Add to Home Screen). No App Store.
Developed from a Windows PC and a MacBook through this repo.

Full product description: `docs/product-spec.md` (read it before building anything).

## Product principles

- Speed first: logging a set takes seconds, minimal taps, typing only when the user wants to.
- Only record what actually happened: sets are never pre-created or pre-filled as done.
  Previous sessions may appear as read-only reference.
- Flexible weight input (per-exercise step, fast reach to high weights, free typing with
  `.` or `,`) so every kind of machine and plate set is covered.
- Works offline in the gym (service worker, local storage).
- Data loss is unacceptable: JSON export/import from day one.
- Weights in kg, stored as integer grams (no floating-point drift).

## Stack (proposed, confirm before scaffolding)

TypeScript, Vite, React, PWA (manifest + service worker), Dexie (IndexedDB), Vitest for pure
logic such as weight parsing. Pin the Node major version in `.nvmrc` (same on both machines).

## Open decisions (ask the user before building)

1. Workout = reusable routine with dated sessions, or one-off session (see spec)
2. How to reach high weights fast (see spec)
3. Data: local-only with export, or account and sync across devices
4. Single user or multiple people
5. UI language (Romanian, English, both)
6. Extras: rest timer, notes per set, bodyweight log, charts

## Working agreements

- Before writing code in a new area, ask questions and propose structure; wait for approval.
- Commit in small logical steps. Pull before starting, push when done (two machines).
- Keep this file short and current; longer notes go in `docs/`.
