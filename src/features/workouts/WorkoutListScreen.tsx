import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { db } from '../../db/instance';
import { listExercises } from '../../db/repo/exercises';
import { listFinishedSessions } from '../../db/repo/sessions';
import { createWorkout, listWorkouts, setWorkoutArchived } from '../../db/repo/workouts';
import { formatSessionDate } from '../../domain/date';
import { lastDoneByWorkout } from '../../domain/history';
import type { Workout } from '../../domain/types';
import { en } from '../../i18n/en';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { EmptyState } from '../../ui/EmptyState';
import { BoltIcon, PlusIcon } from '../../ui/icons';
import { TextPrompt } from '../../ui/TextPrompt';
import { WorkoutIconView } from '../../ui/workout-icons';
import { ResumeBanner } from '../session/ResumeBanner';
import { StartWorkoutButton } from '../session/StartWorkoutButton';
import { DisplayText, DisplayTitle } from '../../ui/DisplayTitle';

const t = en.workouts;

export function WorkoutListScreen() {
  const data = useLiveQuery(
    async () => ({
      workouts: await listWorkouts(db, { includeArchived: true }),
      sessions: await listFinishedSessions(db),
      exercises: await listExercises(db, { includeArchived: true }),
    }),
    [],
  );
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  if (data === undefined) return <p>{en.settings.loading}</p>;
  const all = data.workouts;
  const lastDone = lastDoneByWorkout(data.sessions);
  const exerciseName = new Map(data.exercises.map((e) => [e.id, e.name]));
  const active = all.filter((w) => !w.archived);
  const archived = all.filter((w) => w.archived);

  const metaFor = (workout: Workout) => {
    const done = lastDone.get(workout.id);
    return `${t.exerciseCount(workout.exerciseIds.length)} · ${
      done ? t.lastDone(formatSessionDate(done)) : t.notDoneYet
    }`;
  };
  const previewFor = (workout: Workout) => {
    const names = workout.exerciseIds
      .map((id) => exerciseName.get(id))
      .filter((n) => n !== undefined);
    return t.preview(names.slice(0, 3), Math.max(0, names.length - 3));
  };

  return (
    <section>
      <DisplayTitle>{t.title}</DisplayTitle>
      <p className="page-intro muted">{t.intro}</p>

      <ResumeBanner />

      {active.length === 0 && <EmptyState icon={<BoltIcon />}>{t.empty}</EmptyState>}

      <ul className="list">
        {active.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} meta={metaFor(workout)}>
            <p className="workout-card__preview">{previewFor(workout)}</p>
            <StartWorkoutButton workout={workout} />
          </WorkoutCard>
        ))}
      </ul>

      <button
        type="button"
        className="button button--block button--after"
        onClick={() => setAdding(true)}
      >
        <PlusIcon />
        {t.add}
      </button>

      {archived.length > 0 && (
        <CollapsibleSection title={t.archivedHeading(archived.length)}>
          <ul className="list">
            {archived.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} meta={metaFor(workout)} muted>
                <button
                  type="button"
                  className="button button--block"
                  onClick={() => void setWorkoutArchived(db, workout.id, false)}
                >
                  {en.common.restore}
                </button>
              </WorkoutCard>
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

/** One routine as a card: icon tile, name, a line of facts, and the actions below. */
function WorkoutCard({
  workout,
  meta,
  muted = false,
  children,
}: {
  workout: Workout;
  meta: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={`workout-card${muted ? ' workout-card--muted' : ''}`}>
      <Link className="workout-card__main" to={`/workouts/${workout.id}`}>
        <span className="workout-tile">
          <WorkoutIconView icon={workout.icon} />
        </span>
        <span className="list__text">
          <DisplayText className="workout-card__name">{workout.name}</DisplayText>
          <span className="list__meta">{meta}</span>
        </span>
      </Link>
      {children}
    </li>
  );
}
