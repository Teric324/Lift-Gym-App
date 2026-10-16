import { Link } from 'react-router';
import { itemProgress } from '../../domain/session-items';
import type { DraftItem, Exercise } from '../../domain/types';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { DragHandle, type DragHandleBindings } from '../../ui/drag/DragHandle';
import type { ReorderRowProps } from '../../ui/drag/useReorderableList';
import { CheckIcon } from '../../ui/icons';

const t = en.session;

interface ExerciseRowProps {
  exercise: Exercise;
  item: DraftItem;
  /** Name of the routine exercise this one replaces today, when it is a replacement. */
  insteadOfName: string | null;
  row: ReorderRowProps;
  handle: DragHandleBindings;
}

/** One exercise in the overview: tap to open it, drag the handle to move it. */
export function ExerciseRow({
  exercise,
  item,
  insteadOfName,
  row: { setElement, style, dragging },
  handle,
}: ExerciseRowProps) {
  const progress = itemProgress(item);
  const detail = [
    progress.last ? t.lastSet(formatWeight(progress.last.weightGrams), progress.last.reps) : null,
    insteadOfName ? t.insteadOf(insteadOfName) : null,
  ].filter((part) => part !== null);

  return (
    <li
      ref={setElement}
      className={`session-row drag-row${progress.done ? ' session-row--done' : ''}${dragging ? ' drag-row--dragging' : ''}`}
      style={style}
    >
      <Link className="session-row__main" to={`/session/${exercise.id}`} draggable={false}>
        <span className="session-row__text">
          <span className="session-row__name">{exercise.name}</span>
          {detail.length > 0 && <span className="session-row__meta">{detail.join(' · ')}</span>}
        </span>
        <span className="session-row__progress">
          {progress.done && (
            <span className="session-row__check">
              <CheckIcon />
            </span>
          )}
          {t.setsProgress(progress.checked, progress.total)}
        </span>
      </Link>
      <DragHandle label={t.reorder(exercise.name)} {...handle} />
    </li>
  );
}
