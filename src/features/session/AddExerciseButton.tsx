import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/instance';
import { addExerciseToDraft } from '../../db/repo/drafts';
import { addExercise, listExercises } from '../../db/repo/exercises';
import type { SessionDraft } from '../../domain/types';
import { en } from '../../i18n/en';
import { PlusIcon } from '../../ui/icons';
import { ExercisePicker } from '../workouts/ExercisePicker';

const t = en.session;

/**
 * Adds exercises to the workout in progress, for today only (the routine is not changed). Those
 * already in the session, skipped ones included, and archived ones are not offered.
 */
export function AddExerciseButton({
  sessionId,
  draft,
}: {
  sessionId: string;
  draft: SessionDraft;
}) {
  const [open, setOpen] = useState(false);
  const all = useLiveQuery(() => listExercises(db), []);
  const inSession = new Set(draft.items.map((item) => item.exerciseId));
  const available = (all ?? []).filter((exercise) => !inSession.has(exercise.id));

  return (
    <>
      <button
        type="button"
        className="button button--block button--after"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        {t.addExercise}
      </button>

      <ExercisePicker
        open={open}
        title={t.addExerciseTitle}
        available={available}
        onCancel={() => setOpen(false)}
        onConfirm={async ({ exerciseIds, newNames }) => {
          const created: string[] = [];
          for (const name of newNames) created.push((await addExercise(db, name)).id);
          for (const id of [...exerciseIds, ...created]) {
            await addExerciseToDraft(db, sessionId, id);
          }
          setOpen(false);
        }}
      />
    </>
  );
}
