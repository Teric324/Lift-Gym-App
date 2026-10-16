import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useParams } from 'react-router';
import { db } from '../../db/instance';
import { getExercise, renameExercise, setExerciseArchived } from '../../db/repo/exercises';
import { listWorkoutsUsingExercise } from '../../db/repo/workouts';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TextPrompt } from '../../ui/TextPrompt';
import { ExerciseHistory } from './ExerciseHistory';
import { DisplayTitle } from '../../ui/DisplayTitle';
import { BackLink } from '../../ui/BackLink';

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
        <DisplayTitle>{t.notFound}</DisplayTitle>
        <BackLink to="/exercises">{t.back}</BackLink>
      </section>
    );
  }

  return (
    <section>
      <BackLink to="/exercises">{t.back}</BackLink>
      <DisplayTitle>{exercise.name}</DisplayTitle>
      {exercise.archived && <p className="notice">{t.archivedNote}</p>}

      <div className="screen__actions screen__actions--stretch">
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

      <div className="card">
        <p className="muted">{t.usedIn(workouts.map((w) => w.name))}</p>
        <p className="muted">{t.setsLogged(sets)}</p>
      </div>

      <ExerciseHistory exerciseId={exercise.id} />

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
