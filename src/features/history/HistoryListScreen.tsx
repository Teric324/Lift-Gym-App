import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../../db/instance';
import { listFinishedSessions } from '../../db/repo/sessions';
import { listAllSets } from '../../db/repo/sets';
import { listWorkouts } from '../../db/repo/workouts';
import { formatSessionDate } from '../../domain/date';
import { groupSessionsByMonth, sessionTimeRange, summarizeSessionSets } from '../../domain/history';
import type { SessionSet } from '../../domain/types';
import { en } from '../../i18n/en';
import { EmptyState } from '../../ui/EmptyState';
import './history.css';

const t = en.history;

export function HistoryListScreen() {
  const data = useLiveQuery(
    async () => ({
      sessions: await listFinishedSessions(db),
      sets: await listAllSets(db),
      workouts: await listWorkouts(db, { includeArchived: true }),
    }),
    [],
  );

  if (data === undefined) return <p>{en.settings.loading}</p>;

  const setsBySession = new Map<string, SessionSet[]>();
  for (const set of data.sets) {
    const group = setsBySession.get(set.sessionId);
    if (group) group.push(set);
    else setsBySession.set(set.sessionId, [set]);
  }
  const workoutName = new Map(data.workouts.map((w) => [w.id, w.name]));
  const groups = groupSessionsByMonth(data.sessions);

  return (
    <section>
      <h1>{t.title}</h1>
      <p className="muted">{t.intro}</p>

      {groups.length === 0 && <EmptyState>{t.empty}</EmptyState>}

      {groups.map((group) => (
        <div key={group.key} className="history-month">
          <h2>{group.label}</h2>
          <ul className="list">
            {group.sessions.map((session) => {
              const summary = summarizeSessionSets(setsBySession.get(session.id) ?? []);
              return (
                <li key={session.id} className="list__row">
                  <Link className="list__main" to={`/history/${session.id}`}>
                    <span className="list__title">
                      {formatSessionDate(session.date)} ·{' '}
                      {workoutName.get(session.workoutId) ?? t.unknownWorkout}
                    </span>
                    <span className="list__meta">
                      {t.counts(summary.exercises, summary.sets)} · {sessionTimeRange(session)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
