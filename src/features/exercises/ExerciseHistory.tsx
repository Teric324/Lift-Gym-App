import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { db } from '../../db/instance';
import { listFinishedSessions } from '../../db/repo/sessions';
import { listSetsForExercise } from '../../db/repo/sets';
import { listWorkouts } from '../../db/repo/workouts';
import { formatSessionDate } from '../../domain/date';
import { formatSetsInline, sessionsForExercise } from '../../domain/history';
import { en } from '../../i18n/en';
import { EmptyState } from '../../ui/EmptyState';
import { ChevronRightIcon, HistoryIcon } from '../../ui/icons';

const t = en.exercises;
const VISIBLE_AT_FIRST = 20;

/** The finished workouts in which an exercise was done, newest first, with its sets. */
export function ExerciseHistory({ exerciseId }: { exerciseId: string }) {
  const data = useLiveQuery(
    async () => ({
      sessions: await listFinishedSessions(db),
      sets: await listSetsForExercise(db, exerciseId),
      workouts: await listWorkouts(db, { includeArchived: true }),
    }),
    [exerciseId],
  );
  const [showAll, setShowAll] = useState(false);

  if (data === undefined) return null;

  const entries = sessionsForExercise(exerciseId, data.sessions, data.sets);
  const workoutName = new Map(data.workouts.map((w) => [w.id, w.name]));
  const shown = showAll ? entries : entries.slice(0, VISIBLE_AT_FIRST);

  return (
    <div>
      <h2>{t.historyHeading}</h2>
      {entries.length === 0 && <EmptyState icon={<HistoryIcon />}>{t.historyEmpty}</EmptyState>}
      <ul className="list">
        {shown.map(({ session, sets }) => (
          <li key={session.id} className="list__row">
            <Link className="list__main" to={`/history/${session.id}`}>
              <span className="list__text">
                <span className="list__title">
                  {formatSessionDate(session.date)} ·{' '}
                  {workoutName.get(session.workoutId) ?? en.history.unknownWorkout}
                </span>
                <span className="list__meta">{formatSetsInline(sets)}</span>
              </span>
              <span className="list__chevron">
                <ChevronRightIcon />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!showAll && entries.length > VISIBLE_AT_FIRST && (
        <button
          type="button"
          className="button button--block button--after"
          onClick={() => setShowAll(true)}
        >
          {t.showAll(entries.length)}
        </button>
      )}
    </div>
  );
}
