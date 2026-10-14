import { useEffect, useId, useRef, useState } from 'react';
import { db } from '../../db/instance';
import { replaceDraftExercise } from '../../db/repo/drafts';
import { addExercise } from '../../db/repo/exercises';
import { hasCheckedRows, routineTargetOf } from '../../domain/session-items';
import type { DraftItem, Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { ExercisePicker, type ExerciseSelection } from '../workouts/ExercisePicker';

const t = en.session.replace;

interface ReplaceExerciseFlowProps {
  open: boolean;
  sessionId: string;
  oldExercise: Exercise;
  item: DraftItem;
  /** Exercises of the routine, to know whether "Update the workout" is possible. */
  routineExerciseIds: readonly string[];
  /** Exercises that may take the place (not in the session, not archived). */
  choices: Exercise[];
  onClose: () => void;
}

type Chosen = { exercise: Exercise } | { newName: string };

/** Why the routine cannot be updated for this replacement, or null when it can. */
export function routineUpdateBlocker(
  item: DraftItem,
  routineExerciseIds: readonly string[],
  newExerciseId: string | null,
): 'notFromRoutine' | 'routineChanged' | 'alreadyInRoutine' | null {
  const target = routineTargetOf(item);
  if (target === null) return 'notFromRoutine';
  if (!routineExerciseIds.includes(target)) return 'routineChanged';
  if (newExerciseId !== null && routineExerciseIds.includes(newExerciseId)) {
    return 'alreadyInRoutine';
  }
  return null;
}

/**
 * Replace an exercise of the workout in progress: pick the new one, then choose whether this is
 * only for today (default) or also changes the workout.
 */
export function ReplaceExerciseFlow({
  open,
  sessionId,
  oldExercise,
  item,
  routineExerciseIds,
  choices,
  onClose,
}: ReplaceExerciseFlowProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const groupName = useId();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [scope, setScope] = useState<'today' | 'workout'>('today');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirming = chosen !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  const newName =
    chosen === null ? '' : 'exercise' in chosen ? chosen.exercise.name : chosen.newName;
  const newId = chosen && 'exercise' in chosen ? chosen.exercise.id : null;
  const blocker = chosen ? routineUpdateBlocker(item, routineExerciseIds, newId) : null;
  const doneSets = item.rows.filter((row) => row.checkedSetId !== null).length;

  function reset() {
    setChosen(null);
    setScope('today');
    setError(null);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function apply() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const exercise =
        'exercise' in chosen ? chosen.exercise : await addExercise(db, chosen.newName);
      await replaceDraftExercise(db, sessionId, oldExercise.id, exercise.id, {
        updateWorkout: scope === 'workout' && blocker === null,
      });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : en.session.editFailed);
      setBusy(false);
    }
  }

  function onPicked({ exerciseIds, newNames }: ExerciseSelection) {
    const picked = choices.find((e) => e.id === exerciseIds[0]);
    if (picked) setChosen({ exercise: picked });
    else if (newNames[0]) setChosen({ newName: newNames[0] });
  }

  return (
    <>
      <ExercisePicker
        open={open && !confirming}
        mode="single"
        title={en.session.replace.pickTitle(oldExercise.name)}
        available={choices}
        onCancel={close}
        onConfirm={onPicked}
      />

      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby={`${groupName}-title`}
        onCancel={close}
      >
        <h2 id={`${groupName}-title`}>{t.title(oldExercise.name, newName)}</h2>
        <p>
          {hasCheckedRows(item)
            ? t.keepsDone(oldExercise.name, newName, doneSets)
            : t.dropsPlan(oldExercise.name)}
        </p>

        <fieldset className="choice-group">
          <legend className="field__label">{t.scopeLabel}</legend>
          <label className="choice">
            <input
              type="radio"
              name={groupName}
              checked={scope === 'today'}
              onChange={() => setScope('today')}
            />
            <span>
              <span className="list__title">{t.onlyToday}</span>
              <span className="list__meta">{t.onlyTodayHelp}</span>
            </span>
          </label>
          <label className={`choice${blocker ? ' choice--disabled' : ''}`}>
            <input
              type="radio"
              name={groupName}
              checked={scope === 'workout' && blocker === null}
              disabled={blocker !== null}
              onChange={() => setScope('workout')}
            />
            <span>
              <span className="list__title">{t.updateWorkout}</span>
              <span className="list__meta">
                {blocker === null
                  ? t.updateWorkoutHelp
                  : blocker === 'alreadyInRoutine'
                    ? t.cannotUpdate.alreadyInRoutine(newName)
                    : t.cannotUpdate[blocker]}
              </span>
            </span>
          </label>
        </fieldset>

        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog__actions">
          <button type="button" className="button" disabled={busy} onClick={close}>
            {en.common.cancel}
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={busy}
            onClick={() => void apply()}
          >
            {t.confirm}
          </button>
        </div>
      </dialog>
    </>
  );
}
