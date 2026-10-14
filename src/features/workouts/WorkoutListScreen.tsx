import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { db } from '../../db/instance';
import { createWorkout, listWorkouts, setWorkoutArchived } from '../../db/repo/workouts';
import { en } from '../../i18n/en';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { EmptyState } from '../../ui/EmptyState';
import { TextPrompt } from '../../ui/TextPrompt';
import { ResumeBanner } from '../session/ResumeBanner';
import { StartWorkoutButton } from '../session/StartWorkoutButton';

const t = en.workouts;

export function WorkoutListScreen() {
  const all = useLiveQuery(() => listWorkouts(db, { includeArchived: true }), []);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  if (all === undefined) return <p>{en.settings.loading}</p>;
  const active = all.filter((w) => !w.archived);
  const archived = all.filter((w) => w.archived);

  return (
    <section>
      <h1>{t.title}</h1>
      <p className="muted">{t.intro}</p>

      <ResumeBanner />

      <div className="screen__actions">
        <button type="button" className="button button--primary" onClick={() => setAdding(true)}>
          {t.add}
        </button>
      </div>

      {active.length === 0 && <EmptyState>{t.empty}</EmptyState>}

      <ul className="list">
        {active.map((workout) => (
          <li key={workout.id} className="list__row">
            <Link className="list__main" to={`/workouts/${workout.id}`}>
              <span className="list__title">{workout.name}</span>
              <span className="list__meta">{t.exerciseCount(workout.exerciseIds.length)}</span>
            </Link>
            <StartWorkoutButton workout={workout} />
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <CollapsibleSection title={t.archivedHeading(archived.length)}>
          <ul className="list">
            {archived.map((workout) => (
              <li key={workout.id} className="list__row list__row--muted">
                <Link className="list__main" to={`/workouts/${workout.id}`}>
                  <span className="list__title">{workout.name}</span>
                  <span className="list__meta">{t.exerciseCount(workout.exerciseIds.length)}</span>
                </Link>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => void setWorkoutArchived(db, workout.id, false)}
                >
                  {en.common.restore}
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      <TextPrompt
        open={adding}
        title={t.addTitle}
        label={t.nameLabel}
        confirmLabel={en.common.add}
        onSubmit={async (name) => {
          const workout = await createWorkout(db, name);
          setAdding(false);
          navigate(`/workouts/${workout.id}`);
        }}
        onCancel={() => setAdding(false)}
      />
    </section>
  );
}
