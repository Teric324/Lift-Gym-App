# Lift — Gym Tracker (PWA)

A fast, intuitive workout **tracker**. The user logs exercises, sets, weight and reps, and can
look back at history and personal records. **No recommendations, no progression algorithms, no
auto-prescribed weights.** The app records; the user decides.

Platform: web app / PWA used from the phone browser (Add to Home Screen). No App Store.
Developed from a Windows PC and a MacBook through this repo.

Full product description: `docs/product-spec.md` (read it before building anything).

## Product principles

- Speed first: a repeat of last time's workout is one tap per set; changing anything is easy.
- Sets are pre-filled from the last time but **saved only when checked**; unchecked = not stored.
- Total freedom in a session: edit values, add/delete sets, replace/add/reorder exercises.
- History and PR belong to the exercise (registry), not to the routine.
- Flexible weight input (per-exercise step, jump buttons, free typing with `.` or `,`).
- Works offline in the gym (service worker, local storage).
- Data loss is unacceptable: JSON export/import from day one.
- Weights in kg, stored as integer grams (no floating-point drift).
- UI language is **English**. Keep all UI strings in a single file (`src/i18n/en.ts`) so another
  language can be added later. Exercise names use common gym terms (Bench press, Leg press).

## Data safety

- Never modify an existing Dexie version block. Schema changes only by adding a new `version()`
  with an upgrade. The user's data lives on their phone.

## Stack (proposed, confirm before scaffolding)

TypeScript, Vite, React, PWA (manifest + service worker), Dexie (IndexedDB), Vitest for pure
logic such as weight parsing and PR calculation. Pin the Node major version in `.nvmrc`.

## Open decisions

- PR rule alternative (see spec). Everything else for v1 is decided in the spec.

## Working agreements

- Before writing code in a new area, ask questions and propose structure; wait for approval.
- Commit in small logical steps. Pull before starting, push when done (two machines).
- Keep this file short and current; longer notes go in `docs/`.
