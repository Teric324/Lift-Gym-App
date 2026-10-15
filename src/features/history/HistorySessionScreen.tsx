import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import { db } from '../../db/instance';
import { listExercises } from '../../db/repo/exercises';
import { getSession } from '../../db/repo/sessions';
import { listSetsForSession } from '../../db/repo/sets';
import { getWorkout } from '../../db/repo/workouts';
import { formatSessionDate } from '../../domain/date';
import {
  formatSetLine,
  orderExercisesInSession,
  sessionTimeRange,
  summarizeSessionSets,
} from '../../domain/history';
import { en } from '../../i18n/en';
import { EmptyState } from '../../ui/EmptyState';
import './history.css';

const t = en.history;

/** One finished workout: its exercises with their sets. */
export function HistorySessionScreen() {
  const { id = '' } = useParams();
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

  if (data === undefined) return <p>{en.settings.loading}</p>;

  if (data.session === null) {
    return (
      <section>
        <p>
          <Link to="/history">{t.back}</Link>
        </p>
        <h1>{t.notFound}</h1>
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
        <h1>{workout?.name ?? t.unknownWorkout}</h1>
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

  return (
    <section>
      <p>
        <Link to="/history">{t.back}</Link>
      </p>
      <h1>{workout?.name ?? t.unknownWorkout}</h1>
      <p className="muted">
        {formatSessionDate(session.date)} · {sessionTimeRange(session)}
      </p>
      <p className="muted">{t.counts(summary.exercises, summary.sets)}</p>

      {groups.length === 0 && <EmptyState>{t.noSets}</EmptyState>}

      {groups.map((group) => {
        const exercise = byId.get(group.exerciseId);
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
                <li key={set.id} className="history-set">
                  <span className="history-set__number">{index + 1}</span>
                  <span className="history-set__line">{formatSetLine(set)}</span>
                </li>
              ))}
            </ol>
          </article>
        );
      })}
    </section>
  );
}
