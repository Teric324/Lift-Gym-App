# Product spec (tracker core)

Status: agreed with the user in conversation. Items marked OPEN still need a decision.

## Concepts

- **Workout** = a training day (e.g. "Push" on Monday). It is a reusable routine: the user names it
  freely and adds exercises. Each time the user trains it, a new dated **session** is created.
- **Exercise registry**: every exercise exists once (Bench press, Leg press, Incline press with
  dumbbells). History and PR belong to the exercise, not to the routine. Routines only point to
  exercises in the registry, so changing a routine never loses records.
- **Set** = weight + reps. (Sets are what the user also calls "serii".)

## Training flow

1. Home: list of workouts, **New workout**, and a way to start today's session.
2. Starting a session shows the routine's exercises. For each exercise the sets are pre-filled from
   the last time that exercise was done (number of sets, weight, reps), displayed as **unchecked**.
   An exercise with no history starts empty.
3. A set is **saved only when the user checks it** (one tap). Unchecked sets are never stored.
   Doing 3 of 4 planned sets leaves the 4th unchecked and unrecorded.
4. Before or after checking, the user can edit weight and reps of any set.
5. Total freedom during the session: add or delete sets, skip an exercise, add a new exercise,
   reorder exercises, replace an exercise.
6. **Replace exercise** (e.g. Bench press -> Incline press with dumbbells): applies to today's
   session and asks "only today" (default) or "update the routine". History always stays with the
   exercise that was actually performed.

Identical workout as last time = just check set 1, 2, 3, 4, next exercise.

## History

Past sessions listed by date; each exercise shows its own history across sessions.

## Profile: exercise registry with PRs

The profile lists every exercise with its PR, e.g. "Leg press PR 150 kg x 5".

- **PR = the best set** of that exercise. Rule: heaviest weight; if weights are equal, more reps
  wins. So 5 x 150 beats 1 x 150. OPEN (default stays as above unless the user changes it):
  alternative rule is highest weight x reps for a single set.
- Computed automatically from checked sets, and recalculated when a set is edited or deleted.
- Checking a set that beats the PR may show a small "New PR" badge (visual only).

## Weight input

1. **Step picker.** The user chooses the weight step per exercise (0.25, 0.5, 1, 2, 2.5, 4, 5 or a
   custom value). The list is step, 2*step, 3*step, ... so step 0.25 gives 0.25, 0.5, 0.75, ...
   The step is remembered per exercise and can be changed any time.
2. **Fast reach** to high weights (e.g. 100 kg) without long scrolling: jump buttons (+10 / +25)
   next to the list.
3. **Free typing.** Accept `27.25`, also decimal comma (`27,25`), surrounding spaces and a trailing
   `kg`; reject empty, negative, non-numeric or absurd values.

Implementation notes:
- `parseWeight(input)` is a pure function with unit tests.
- Store weight as an integer (grams); generate step lists by integer multiplication, never by
  repeated floating-point addition.
- The picker may open scrolled near the last used weight, but nothing is selected until a tap.

## Defaults for v1

Local-only storage (IndexedDB) with JSON export/import; single user; English UI (all UI strings in one file, so another language can be added later); installable PWA
that works offline.

## Out of scope for v1

Recommendations, progression algorithms, auto-prescribed weights, accounts and sync, PR tables per
rep count, manual entry of old PRs, warm-up flag. A progression feature may come much later.
