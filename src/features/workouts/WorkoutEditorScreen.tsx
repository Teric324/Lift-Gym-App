import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { db } from '../../db/instance';
import { addExercise, listExercises } from '../../db/repo/exercises';
import {
  getWorkout,
  moveWorkoutExercise,
  renameWorkout,
  setWorkoutArchived,
  setWorkoutIcon,
  updateWorkoutExercises,
} from '../../db/repo/workouts';
import { WORKOUT_ICONS, type Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DragHandle } from '../../ui/drag/DragHandle';
import { useReorderableList } from '../../ui/drag/useReorderableList';
import { EmptyState } from '../../ui/EmptyState';
import { TextPrompt } from '../../ui/TextPrompt';
import { WorkoutIconView } from '../../ui/workout-icons';
import { useActiveSession } from '../session/useActiveSession';
import { ExercisePicker } from './ExercisePicker';

const t = en.workouts;
const NO_IDS: readonly string[] = [];

export function WorkoutEditorScreen() {
  const { id = '' } = useParams();
  const data = useLiveQuery(
    async () => ({
      workout: (await getWorkout(db, id)) ?? null,
      exercises: await listExercises(db, { includeArchived: true }),
    }),
    [id],
  );
  const [renaming, setRenaming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [picking, setPicking] = useState(false);
  const activeSession = useActiveSession();
  const list = useReorderableList(data?.workout?.exerciseIds ?? NO_IDS, (exerciseId, to) =>
    moveWorkoutExercise(db, id, exerciseId, to),
  );

  if (data === undefined) return <p>{en.settings.loading}</p>;
  const { workout, exercises } = data;

  if (workout === null) {
    return (
      <section>
        <h1>{t.notFound}</h1>
        <Link to="/">{t.back}</Link>
      </section>
    );
  }

  const byId = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));
  const inWorkout = new Set(workout.exerciseIds);
  const available = exercises.filter((e) => !e.archived && !inWorkout.has(e.id));

  const edit = (update: (ids: readonly string[]) => readonly string[]) =>
    void updateWorkoutExercises(db, workout.id, update);

  return (
    <section>
      <p>
        <Link to="/">{t.back}</Link>
      </p>
      <h1>{workout.name}</h1>
      {workout.archived && <p className="notice">{t.archivedNote}</p>}
      {activeSession?.workoutId === workout.id && (
        <p className="notice" role="status">
          {t.inProgressNote}
        </p>
      )}

      <div className="screen__actions">
        <button type="button" className="button" onClick={() => setRenaming(true)}>
          {t.rename}
        </button>
        {workout.archived ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => void setWorkoutArchived(db, workout.id, false)}
          >
            {en.common.restore}
          </button>
        ) : (
          <button
            type="button"
            className="button button--danger"
            onClick={() => setArchiving(true)}
          >
            {en.common.archive}
          </button>
        )}
      </div>

      <h2 id="workout-icon-label">{t.iconLabel}</h2>
      <div className="icon-picker" role="radiogroup" aria-labelledby="workout-icon-label">
        {WORKOUT_ICONS.map((icon) => {
          const selected = workout.icon === icon;
          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t.icons[icon]}
              className={selected ? 'icon-picker__tile is-selected' : 'icon-picker__tile'}
              onClick={() => void setWorkoutIcon(db, workout.id, icon)}
            >
              <WorkoutIconView icon={icon} />
            </button>
          );
        })}
      </div>

      <h2>{t.exercisesHeading}</h2>
      {workout.exerciseIds.length === 0 && <EmptyState>{t.emptyExercises}</EmptyState>}

      {list.failed && (
        <p className="field__error" role="alert">
          {t.editFailed}
        </p>
      )}
      <ol className={`list${list.dragging ? ' drag-list--dragging' : ''}`}>
        {list.shownIds.map((exerciseId, index) => {
          const exercise = byId.get(exerciseId);
          const name = exercise?.name ?? exerciseId;
          const row = list.rowProps(exerciseId, index);
          return (
            <li
              key={exerciseId}
              ref={row.setElement}
              style={row.style}
              className={`list__row drag-row${exercise?.archived ? ' list__row--muted' : ''}${row.dragging ? ' drag-row--dragging' : ''}`}
            >
              <span className="list__main">
                <span className="list__title">{name}</span>
                {exercise?.archived && (
                  <span className="list__meta">
                    <span className="tag">{en.common.archivedTag}</span> {t.archivedExercise}
                  </span>
                )}
              </span>
              <span className="list__actions">
                <button
                  type="button"
                  className="button button--small"
                  aria-label={t.removeExercise(name)}
                  onClick={() => edit((ids) => ids.filter((x) => x !== exerciseId))}
                >
                  ✕
                </button>
              </span>
              <DragHandle label={t.reorder(name)} {...list.handleProps(exerciseId)} />
            </li>
          );
        })}
      </ol>

      <div className="screen__actions">
        <button type="button" className="button button--primary" onClick={() => setPicking(true)}>
          {t.addExercises}
        </button>
      </div>

      <ExercisePicker
        open={picking}
        available={available}
        onCancel={() => setPicking(false)}
        onConfirm={async ({ exerciseIds, newNames }) => {
          const created: string[] = [];
          for (const name of newNames) created.push((await addExercise(db, name)).id);
          await updateWorkoutExercises(db, workout.id, (ids) => [
            ...ids,
            ...exerciseIds,
            ...created,
          ]);
          setPicking(false);
        }}
      />

      <TextPrompt
        open={renaming}
        title={t.renameTitle}
        label={t.nameLabel}
        initialValue={workout.name}
        confirmLabel={en.common.save}
        onSubmit={async (name) => {
          await renameWorkout(db, workout.id, name);
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />

      <ConfirmDialog
        open={archiving}
        title={t.archiveTitle}
        confirmLabel={en.common.archive}
        danger
        onCancel={() => setArchiving(false)}
        onConfirm={async () => {
          await setWorkoutArchived(db, workout.id, true);
          setArchiving(false);
        }}
      >
        <p>{t.archiveBody}</p>
      </ConfirmDialog>
    </section>
  );
}
