import { db } from '../../db/instance';
import { addDraftRow } from '../../db/repo/drafts';
import type { DraftItem, Exercise } from '../../domain/types';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { SetRow } from './SetRow';

const t = en.session;

interface SessionExerciseCardProps {
  sessionId: string;
  exercise: Exercise;
  item: DraftItem;
}

/** One exercise of the session with its set rows. */
export function SessionExerciseCard({ sessionId, exercise, item }: SessionExerciseCardProps) {
  return (
    <article className="exercise-card">
      <header className="exercise-card__header">
        <h2 className="exercise-card__title">{exercise.name}</h2>
        <span className="muted">{t.stepNote(formatWeight(exercise.stepGrams))}</span>
      </header>

      {item.rows.length === 0 && <p className="muted">{t.noSets}</p>}

      <ol className="set-list">
        {item.rows.map((row, index) => (
          <SetRow
            key={row.id}
            sessionId={sessionId}
            exercise={exercise}
            row={row}
            number={index + 1}
          />
        ))}
      </ol>

      <button
        type="button"
        className="button"
        onClick={() => void addDraftRow(db, sessionId, exercise.id)}
      >
        {t.addSet}
      </button>
    </article>
  );
}
