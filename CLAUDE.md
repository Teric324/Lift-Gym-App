# Lift — Gym Tracker (PWA)

A fast, intuitive workout **tracker**. The user logs exercises, sets, weight and reps, and can
look back at history. **No recommendations, no progression algorithms, no auto-prescribed
weights.** The app records; the user decides.

Platform: web app / PWA used from the phone browser (Add to Home Screen). No App Store.
Developed from a Windows PC and a MacBook through this repo.

## Product principles

- Speed first: logging a set takes seconds, with minimal taps and no typing where avoidable.
- Show "last time" for each exercise (previous weight x reps) as reference while logging.
  This is a record, not a suggestion.
- Works offline in the gym (service worker, local storage).
- Data loss is unacceptable: JSON export/import from day one.
- Weights in kg.

## Stack (proposed, confirm before scaffolding)

TypeScript, Vite, React, PWA (manifest + service worker), Dexie (IndexedDB), Vitest for the data
layer. Pin the Node major version in `.nvmrc` (same on both machines).

## Open decisions (ask the user before building)

1. Data: local-only with export, or account and sync across devices
2. Single user or multiple people
3. UI language (Romanian, English, both)
4. Fixed routines/templates (e.g. Push day pre-fills exercises) or free-form workouts
5. Rest timer, notes per set, bodyweight log, other extras

## Working agreements

- Before writing code in a new area, ask questions and propose structure; wait for approval.
- Commit in small logical steps. Pull before starting, push when done (two machines).
- Keep this file short and current; put longer notes in `docs/`.
