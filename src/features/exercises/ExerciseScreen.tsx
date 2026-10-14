import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { db } from '../../db/instance';
import {
  getExercise,
  renameExercise,
  setExerciseArchived,
  setExerciseStep,
} from '../../db/repo/exercises';
import { listWorkoutsUsingExercise } from '../../db/repo/workouts';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextPrompt } from '../../ui/TextPrompt';
import { StepPicker } from './StepPicker';

const t = en.exercises;

export function ExerciseScreen() {
  const { id = '' } = useParams();
  const data = useLiveQuery(
    async () => ({
      exercise: (await getExercise(db, id)) ?? null,
      workouts: await listWorkoutsUsingExercise(db, id),
      sets: await db.sets.where('exerciseId').equals(id).count(),
    }),
    [id],
  );
  const [renaming, setRenaming] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (data === undefined) return <p>{en.settings.loading}</p>;
  const { exercise, workouts, sets } = data;

  if (exercise === null) {
    return (
      <section>
        <h1>{t.notFound}</h1>
        <Link to="/exercises">{t.back}</Link>
      </section>
    );
  }

  return (
    <section>
      <p>
        <Link to="/exercises">{t.back}</Link>
      </p>
      <h1>{exercise.name}</h1>
      {exercise.archived && <p className="notice">{t.archivedNote}</p>}

      <div className="screen__actions">
        <button type="button" className="button" onClick={() => setRenaming(true)}>
          {t.rename}
        </button>
        {exercise.archived ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => void setExerciseArchived(db, exercise.id, false)}
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

      <p className="muted">{t.usedIn(workouts.map((w) => w.name))}</p>
      <p className="muted">{t.setsLogged(sets)}</p>

      <StepPicker
        stepGrams={exercise.stepGrams}
        onChange={(grams) => setExerciseStep(db, exercise.id, grams)}
      />

      <TextPrompt
        open={renaming}
        title={t.renameTitle}
        label={t.nameLabel}
        initialValue={exercise.name}
        confirmLabel={en.common.save}
        validate={async (name) => {
          const other = await db.exercises
            .filter((e) => e.id !== exercise.id && e.name.toLowerCase() === name.toLowerCase())
            .first();
          return other ? t.nameTaken(other.name) : null;
        }}
        onSubmit={async (name) => {
          await renameExercise(db, exercise.id, name);
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
          await setExerciseArchived(db, exercise.id, true);
          setArchiving(false);
        }}
      >
        <p>{t.archiveBody(workouts.length)}</p>
      </ConfirmDialog>
    </section>
  );
}
