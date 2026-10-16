import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '../../db/instance';
import { listExercises } from '../../db/repo/exercises';
import {
  addSetToFinishedSession,
  deleteSession,
  deleteSetFromFinishedSession,
  getSession,
} from '../../db/repo/sessions';
import { listSetsForSession } from '../../db/repo/sets';
import { getWorkout } from '../../db/repo/workouts';
import { formatSessionDate } from '../../domain/date';
import {
  orderExercisesInSession,
  sessionTimeRange,
  summarizeSessionSets,
} from '../../domain/history';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { HistorySetRow } from './HistorySetRow';
import './history.css';
import { DisplayTitle } from '../../ui/DisplayTitle';

const t = en.history;

/** One finished workout: its exercises with their sets, and a way to correct or delete it. */
export function HistorySessionScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    const session = (await getSession(db, id)) ?? null;
    if (!session) return { session: null };
    return {
      session,
      sets: await listSetsForSession(db, id),
      workout: (await getWorkout(db, session.workoutId)) ?? null,
      exercises: await listExercises(db, { includeArchived: true }),
    };
  }, [id]);

  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<
    { kind: 'workout' } | { kind: 'last-set'; setId: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) return <p>{en.settings.loading}</p>;

  if (data.session === null) {
    return (
      <section>
        <p>
          <Link to="/history">{t.back}</Link>
        </p>
        <DisplayTitle>{t.notFound}</DisplayTitle>
      </section>
    );
  }

  const { session, sets, workout, exercises } = data;

  if (session.finishedAt === null) {
    return (
      <section>
        <p>
          <Link to="/history">{t.back}</Link>
        </p>
        <DisplayTitle>{workout?.name ?? t.unknownWorkout}</DisplayTitle>
        <p className="notice">{t.inProgress}</p>
        <Link className="button button--primary" to="/session">
          {t.openWorkout}
        </Link>
      </section>
    );
  }

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const groups = orderExercisesInSession(sets);
  const summary = summarizeSessionSets(sets);

  async function attempt(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch {
      setError(t.failed);
    }
  }

  async function removeSet(setId: string) {
    // The only set of the workout: ask first, because the whole workout goes with it.
    if (sets.length <= 1) {
      setConfirm({ kind: 'last-set', setId });
      return;
    }
    await attempt(() => deleteSetFromFinishedSession(db, setId));
  }

  async function confirmed() {
    const pending = confirm;
    setConfirm(null);
    if (!pending) return;
    await attempt(async () => {
      if (pending.kind === 'workout') await deleteSession(db, session.id);
      else await deleteSetFromFinishedSession(db, pending.setId);
      navigate('/history');
    });
  }

  return (
    <section>
      <p>
        <Link to="/history">{t.back}</Link>
      </p>
      <DisplayTitle>{workout?.name ?? t.unknownWorkout}</DisplayTitle>
      <p className="muted">
        {formatSessionDate(session.date)} · {sessionTimeRange(session)}
      </p>
      <p className="muted">{t.counts(summary.exercises, summary.sets)}</p>

      <div className="screen__actions">
        <button
          type="button"
          className={`button${editing ? ' button--primary' : ''}`}
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? t.done : t.edit}
        </button>
      </div>
      {editing && <p className="notice">{t.editing}</p>}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {groups.length === 0 && <EmptyState>{t.noSets}</EmptyState>}

      {groups.map((group) => {
        const exercise = byId.get(group.exerciseId);
        const last = group.sets.at(-1);
        return (
          <article key={group.exerciseId} className="history-exercise">
            <h2 className="history-exercise__title">
              <Link to={`/exercises/${group.exerciseId}`}>
                {exercise?.name ?? group.exerciseId}
              </Link>
              {exercise?.archived && <span className="tag"> {en.common.archivedTag}</span>}
            </h2>
            <ol className="history-sets">
              {group.sets.map((set, index) => (
                <HistorySetRow
                  key={set.id}
                  set={set}
                  number={index + 1}
                  editing={editing}
                  onRemove={() => void removeSet(set.id)}
                />
              ))}
            </ol>
            {editing && last && (
              <button
                type="button"
                className="button"
                onClick={() =>
                  void attempt(() =>
                    addSetToFinishedSession(db, {
                      sessionId: session.id,
                      exerciseId: group.exerciseId,
                      weightGrams: last.weightGrams,
                      reps: last.reps,
                    }),
                  )
                }
              >
                {t.addSet}
              </button>
            )}
          </article>
        );
      })}

      {editing && (
        <div className="finish-bar">
          <button
            type="button"
            className="button button--danger"
            onClick={() => setConfirm({ kind: 'workout' })}
          >
            {t.deleteWorkout}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm?.kind === 'workout'}
        title={t.deleteTitle}
        confirmLabel={t.deleteConfirm}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => void confirmed()}
      >
        <p>{t.deleteBody(summary.sets, formatSessionDate(session.date))}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.kind === 'last-set'}
        title={t.lastSetTitle}
        confirmLabel={t.lastSetConfirm}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => void confirmed()}
      >
        <p>{t.lastSetBody}</p>
      </ConfirmDialog>
    </section>
  );
}
