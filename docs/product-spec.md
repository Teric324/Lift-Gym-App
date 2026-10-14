# Product spec (tracker core)

Status: draft from the user's description. Items marked OPEN need the user's decision.

## Core flow

1. Home shows the list of workouts and a **New workout** action.
2. The user names a workout freely (Legs, Chest, Pull, Push, anything).
3. Inside a workout the user adds exercises (search the library or create one: Incline press, Dips, ...).
4. Opening an exercise lets the user log sets. A set = weight + reps, entered **after** it was performed.
5. Sets are never pre-created and never pre-filled as done. If the user planned 4 sets but did 3,
   exactly 3 exist. The previous session may be shown as read-only reference text.

OPEN: is a workout a reusable named routine (new dated session each time you train it, with history
per exercise), or a single one-off session? Recommendation: reusable routine + dated sessions.

## Weight input

The user can enter weight in three ways, all valid at any time:

1. **Step picker.** The user chooses the weight step per exercise (examples: 0.25, 0.5, 1, 2, 2.5,
   4, 5, or a custom value). The list is step, 2*step, 3*step, ... so step 0.25 gives 0.25, 0.5,
   0.75, ... Machines that go 5 to 25 kg, plates with 0.25 kg fractions, and machines that jump
   2 to 4 kg are all covered by choosing a different step. The step is remembered per exercise and
   can be changed at any time.
2. **Fast reach.** The user must be able to reach high weights (e.g. 100 kg) without long scrolling.
   OPEN: two-level picker (coarse + fine), jump buttons (+10 / +25), or a start/end range.
3. **Free typing.** The user can type any value, e.g. `27.25`. The parser must also accept a decimal
   comma (`27,25`, common on Romanian keyboards), surrounding spaces and a trailing `kg`, and must
   reject empty, negative, non-numeric or absurd values.

Implementation notes:
- `parseWeight(input)` is a pure function with unit tests.
- Store weight as an integer (grams) and generate step lists by integer multiplication, so there is
  never floating-point drift (no 0.1 + 0.2 problems).
- The picker may open scrolled near the last used weight, but nothing is selected until the user taps.

## Reps

Number entry with minimal taps (stepper and/or number pad). OPEN: whether to offer an explicit
"repeat last set" button (copies the set just logged, only on user tap).

## Out of scope

Recommendations, progression algorithms, auto-prescribed weights, accounts and sync (for now).
