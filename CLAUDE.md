# Lift — Gym Progress App (PWA)

Personal strength-training app. The user logs sets (weight, reps, RIR); the app prescribes
next session's weight and reps automatically. It replaces the spreadsheet organised lifters keep.

**Platform:** web app / PWA, used from the phone browser (Add to Home Screen). No App Store,
no Apple Developer account. Developed from both a Windows PC and a MacBook via this repo.
The earlier iOS/Swift plan is abandoned; its Swift code (if any) lives in a separate repo
and is reference only for porting.

## Stack (proposed, confirm before scaffolding)

- TypeScript, Vite, React, PWA (manifest + service worker, offline-first)
- Vitest for tests
- Dexie (IndexedDB) for local storage; keep the storage layer swappable for later sync
- Same Node major version on both machines (pin in `.nvmrc`)

## Open decisions (ask the user before building)

1. What the user wants to change drastically versus the original concept
2. Data: local-only with JSON export/import, or sync across devices (needs backend + login)
3. Single user, or other people too
4. How much the rest timer matters (iOS Safari cannot vibrate or run JS with the screen locked;
   Wake Lock keeps the screen on, an audio cue works better than vibration)

## Architecture rules

- `src/engine/` is the progression engine: **pure TypeScript**, no React, no Dexie, no DOM.
  Plain serialisable types in, plain types out.
- Deterministic: never call `Date.now()` / `new Date()` inside the engine; dates are parameters.
- Weights are kg internally. Unit conversion is presentation only.
- Logging a set must take under 3 seconds. This is the primary UX constraint.
- Data loss is unacceptable: always provide export/backup (JSON) even before any sync exists.

## Progression rules (apply in this order; later rules override earlier ones)

**Rule 0, calibration (week 1).** No prescription maths. User works up to one set of 8–10 reps at
about 2 RIR per exercise. Estimate 1RM with Epley: `weight * (1 + reps / 30)`. Valid only for
reps <= 10: clamp reps to 10 in the formula and flag the estimate low-confidence above that.
Seed working weight = logged weight, rep target = bottom of range. Rationale: `calibration`.

**Rule 1, double progression.** Each exercise has a rep range (e.g. 8–12). All working sets at the
top of the range: add the weight increment and reset the target to the bottom. Otherwise hold
weight and target = reps on the first short set + 1.

**Rule 2, RIR autoregulation** (RIR is optional everywhere; if missing, fall back to Rule 1). Use
the RIR of the last working set:
- RIR >= 3: load too light. Apply the increment even if the top of range was not reached; if it
  was reached, a double increment (subject to Rules 3, 4 and 8).
- RIR 2: normal, follow Rule 1.
- RIR 1: hold weight, target +1 rep.
- RIR 0 and reps >= range bottom: hold weight and target, increment stall counter.
- RIR 0 and reps < range bottom: too heavy. Reduce by one increment, target = range bottom.

**Rule 3, increment sanity clamp.** If `increment / currentWorkingWeight > 0.05`, do NOT add
weight; add reps instead, past the top of the range, until the jump would be under 5%. Then apply
the increment and reset to the bottom of the range. Required case: a 10 kg dumbbell curl at 12 reps
with a 5 kg increment must not prescribe 15 kg.

**Rule 4, experience and age.**
- beginner: may increment every session; double increment allowed on lower-body compounds for the
  first 4 weeks
- intermediate: at most one increment per exercise per week
- advanced: increment only when the top of range is hit with RIR >= 2 on every working set
- age > 45: never double increments; use the shorter mesocycle. Age affects nothing else and is
  not a coefficient anywhere.

**Rule 5, stall and deload.** A stall is a session where neither total volume (sum of weight x reps)
nor estimated 1RM improved versus the previous session. Three consecutive stalls: exercise-level
deload at 90% of weight, rounded down to an achievable load, target = range bottom, reset the
counter. Two such deloads on one exercise within 8 weeks: return a deload plus a flag suggesting
a swap or a full deload week (data on the prescription, no printing).

**Rule 6, mesocycle.** Default 5 weeks: 4 accumulation + 1 deload. Advanced or age > 45: 4 weeks
(3 + 1). Cycle length is configurable, not hard-coded. Deload week: 60% of working weight, half the
working sets, RIR 4+.

**Rule 7, achievable loads.** Never emit a load nobody can set up. Barbell: bar weight (default
20 kg) + 2 x plate stack per side, never below bar weight. Dumbbell: nearest available step.
Machine/cable: nearest pin increment. Bodyweight: progress by reps only. Round down on deloads,
nearest on progressions.

**Rule 8, safety cap.** A single session never raises working weight by more than 10%.

Default increments: barbell 2.5 kg, dumbbell 2.0 kg per hand, machine 5.0 kg, cable 2.5 kg,
smith machine 2.5 kg, bodyweight 0. Overridable per exercise (e.g. 0.5 kg with micro-plates).

`prescribe()` returns weight, target reps, target sets and a `rationale`
(`progressedWeight | progressedReps | held | reducedLoad | deload | calibration`). The UI shows
the rationale to the user, so it must be testable.

## Strength standards (display only)

Bodyweight multiples by lift and sex, bands untrained / novice / intermediate / advanced / elite,
for squat, bench, deadlift, overhead press and barbell row. This is the only place age and
bodyweight appear. It must never feed back into `prescribe()`. Keep it in its own file.

## Required tests

1. Beginner barbell squat, 8 simulated weeks hitting top of range: weight rises by exactly one
   increment per session, never a fraction of a plate.
2. 10 kg dumbbell curl: engine adds reps, not 5 kg.
3. Three stalled sessions: deload fires on exactly the third, at 90% rounded down.
4. RIR 0 with reps below range bottom: load decreases.
5. All RIR values missing: still a valid prescription via Rule 1.
6. Epley with 15 reps: clamped to 10, flagged low-confidence.
7. Property test, 500 random sessions: rounding never returns a barbell load below bar weight or
   an impossible plate combination.
8. Advanced lifter with RIR 2 on three sets and RIR 0 on the fourth: no increment.

## Working agreements

- Before writing code in a new area, ask questions and propose structure; wait for approval.
- Run the tests as you go; commit in small logical steps (one rule per commit where sensible).
- Pull before starting, push when done: the user works from two machines.
- Keep this file current when decisions change.
