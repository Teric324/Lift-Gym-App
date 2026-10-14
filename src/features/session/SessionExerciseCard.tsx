import { useState } from 'react';
import { db } from '../../db/instance';
import {
  addDraftRow,
  ItemHasCheckedSetsError,
  moveDraftItem,
  skipDraftItem,
} from '../../db/repo/drafts';
import type { DraftItem, Exercise } from '../../domain/types';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ExerciseMenu } from './ExerciseMenu';
import { ReplaceExerciseFlow } from './ReplaceExerciseFlow';
import { SetRow } from './SetRow';

const t = en.session;

interface SessionExerciseCardProps {
  sessionId: string;
  exercise: Exercise;
  item: DraftItem;
  /** Name of the routine exercise this one replaces today, when it is a replacement. */
  insteadOfName: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Exercises of the routine, to know whether the workout itself can be updated. */
  routineExerciseIds: readonly string[];
  /** Registry exercises that can be chosen as a replacement (not in the session, not archived). */
  replacementChoices: Exercise[];
}

/** One exercise of the session: its set rows and the actions to move, replace or skip it. */
export function SessionExerciseCard({
  sessionId,
  exercise,
  item,
  insteadOfName,
  canMoveUp,
  canMoveDown,
  routineExerciseIds,
  replacementChoices,
}: SessionExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkedCount = item.rows.filter((row) => row.checkedSetId !== null).length;

  async function attempt(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      if (e instanceof ItemHasCheckedSetsError) setConfirmSkip(e.checkedSets);
      else setError(t.editFailed);
    }
  }

  return (
    <article className="exercise-card">
      <header className="exercise-card__header">
        <div className="exercise-card__heading">
          <h2 className="exercise-card__title">{exercise.name}</h2>
          <span className="muted">
            {insteadOfName ? `${t.insteadOf(insteadOfName)} · ` : ''}
            {t.stepNote(formatWeight(exercise.stepGrams))}
          </span>
        </div>
        <div className="exercise-card__actions">
          <button
            type="button"
            className="button button--small"
            aria-label={t.moveUp(exercise.name)}
            disabled={!canMoveUp}
            onClick={() => void attempt(() => moveDraftItem(db, sessionId, exercise.id, -1))}
          >
            ↑
          </button>
          <button
            type="button"
            className="button button--small"
            aria-label={t.moveDown(exercise.name)}
            disabled={!canMoveDown}
            onClick={() => void attempt(() => moveDraftItem(db, sessionId, exercise.id, 1))}
          >
            ↓
          </button>
          <button
            type="button"
            className="button button--small"
            aria-label={t.more(exercise.name)}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
          >
            ⋯
          </button>
        </div>
      </header>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {item.rows.length === 0 && <p className="muted">{t.noSets}</p>}

      <ol className="set-list">
        {item.rows.map((row, index) => (
          <SetRow
            key={row.id}
            sessionId={sessionId}
            exercise={exercise}
            row={row}
            number={index + 1}
          />
        ))}
      </ol>

      <button
        type="button"
        className="button"
        onClick={() => void addDraftRow(db, sessionId, exercise.id)}
      >
        {t.addSet}
      </button>

      <ExerciseMenu
        open={menuOpen}
        exerciseName={exercise.name}
        onClose={() => setMenuOpen(false)}
        onReplace={() => {
          setMenuOpen(false);
          setReplacing(true);
        }}
        onSkip={() => {
          setMenuOpen(false);
          if (checkedCount > 0) setConfirmSkip(checkedCount);
          else void attempt(() => skipDraftItem(db, sessionId, exercise.id));
        }}
      />

      <ConfirmDialog
        open={confirmSkip !== null}
        title={t.skipTitle}
        confirmLabel={t.skipConfirm}
        danger
        onCancel={() => setConfirmSkip(null)}
        onConfirm={async () => {
          setConfirmSkip(null);
          await attempt(() =>
            skipDraftItem(db, sessionId, exercise.id, { removeCheckedSets: true }),
          );
        }}
      >
        <p>{t.skipBody(confirmSkip ?? checkedCount)}</p>
      </ConfirmDialog>

      <ReplaceExerciseFlow
        open={replacing}
        sessionId={sessionId}
        oldExercise={exercise}
        item={item}
        routineExerciseIds={routineExerciseIds}
        choices={replacementChoices}
        onClose={() => setReplacing(false)}
      />
    </article>
  );
}
