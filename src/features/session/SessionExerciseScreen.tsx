import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { db } from '../../db/instance';
import { addDraftRow, ItemHasCheckedSetsError, skipDraftItem } from '../../db/repo/drafts';
import { listExercises } from '../../db/repo/exercises';
import { visibleItems } from '../../domain/session-items';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ExerciseMenu } from './ExerciseMenu';
import { ReplaceExerciseFlow } from './ReplaceExerciseFlow';
import { SetRow } from './SetRow';
import './session.css';
import { useSessionView } from './useSessionView';

const t = en.session;

/**
 * One exercise of the workout in progress, at /session/:exerciseId: its set rows, Add set, the
 * ... menu (replace, skip) and a way on to the next exercise. Keyed by the exercise id, so going
 * to another exercise reads the session afresh instead of showing the previous one.
 */
export function SessionExerciseScreen() {
  const { exerciseId = '' } = useParams();
  return <ExerciseView key={exerciseId} exerciseId={exerciseId} />;
}

function ExerciseView({ exerciseId }: { exerciseId: string }) {
  const navigate = useNavigate();
  const view = useSessionView();
  const registry = useLiveQuery(() => listExercises(db, { includeArchived: true }), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set once a replacement is saved: the old exercise may be gone from the session by then, and
  // that must not send the user back to the overview on the way to the new exercise.
  const [leaving, setLeaving] = useState(false);

  // Blank rather than "Loading...": the read takes a moment on every step to another exercise.
  if (view === undefined || registry === undefined) return null;

  const item = view?.draft.items.find((i) => i.exerciseId === exerciseId && !i.skipped);
  const exercise = registry.find((e) => e.id === exerciseId);
  if (!view || !item || !exercise) {
    return leaving ? null : <Navigate to="/session" replace />;
  }

  const { session, workout, draft } = view;
  const byId = new Map(registry.map((e) => [e.id, e]));
  const items = visibleItems(draft.items);
  const next = items[items.findIndex((i) => i.exerciseId === exerciseId) + 1];
  const nextName = next ? byId.get(next.exerciseId)?.name : undefined;
  const insteadOfName =
    item.origin === 'replacement' && item.replacesExerciseId
      ? (byId.get(item.replacesExerciseId)?.name ?? null)
      : null;
  const inSession = new Set(draft.items.map((i) => i.exerciseId));
  const replacementChoices = registry.filter((e) => !e.archived && !inSession.has(e.id));
  const checkedCount = item.rows.filter((row) => row.checkedSetId !== null).length;
  const sessionId = session.id;

  async function attempt(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      if (e instanceof ItemHasCheckedSetsError) setConfirmSkip(e.checkedSets);
      else setError(t.editFailed);
      return false;
    }
  }

  async function skip(removeCheckedSets: boolean) {
    const done = await attempt(() =>
      skipDraftItem(db, sessionId, exerciseId, { removeCheckedSets }),
    );
    if (done) {
      setLeaving(true);
      navigate('/session', { replace: true });
    }
  }

  return (
    <section>
      <Link className="back-link" to="/session">
        <span aria-hidden="true">‹</span>
        {t.backToWorkoutLink}
      </Link>

      <header className="exercise-head">
        <div className="exercise-head__text">
          <h1 className="exercise-head__title">{exercise.name}</h1>
          <p className="exercise-head__meta">
            <span className="tag">{t.stepNote(formatWeight(exercise.stepGrams))}</span>
            {insteadOfName && <span className="muted">{t.insteadOf(insteadOfName)}</span>}
          </p>
        </div>
        <button
          type="button"
          className="button exercise-head__more"
          aria-label={t.more(exercise.name)}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
        >
          ⋯
        </button>
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
        className="button add-set"
        onClick={() => void attempt(() => addDraftRow(db, sessionId, exercise.id))}
      >
        <span aria-hidden="true">+</span> {t.addSet}
      </button>

      {next && nextName ? (
        <Link className="button button--primary next-exercise" to={`/session/${next.exerciseId}`}>
          {t.nextExercise(nextName)}
        </Link>
      ) : (
        <Link className="button button--primary next-exercise" to="/session">
          {t.backToWorkout}
        </Link>
      )}

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
          else void skip(false);
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
          await skip(true);
        }}
      >
        <p>{t.skipBody(confirmSkip ?? checkedCount)}</p>
      </ConfirmDialog>

      <ReplaceExerciseFlow
        open={replacing}
        sessionId={sessionId}
        oldExercise={exercise}
        item={item}
        routineExerciseIds={workout?.exerciseIds ?? []}
        choices={replacementChoices}
        onClose={() => setReplacing(false)}
        onReplaced={(newExerciseId) => {
          setLeaving(true);
          navigate(`/session/${newExerciseId}`, { replace: true });
        }}
      />
    </section>
  );
}
