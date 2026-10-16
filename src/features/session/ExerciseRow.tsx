import { Link } from 'react-router';
import { itemProgress } from '../../domain/session-items';
import type { DraftItem, Exercise } from '../../domain/types';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';
import { CheckIcon, GripIcon } from '../../ui/icons';

const t = en.session;

interface ExerciseRowProps {
  exercise: Exercise;
  item: DraftItem;
  /** Name of the routine exercise this one replaces today, when it is a replacement. */
  insteadOfName: string | null;
  /** The row being dragged, or the amount it is pushed aside while another one is. */
  dragging: boolean;
  offsetPx: number;
  rowRef: (element: HTMLElement | null) => void;
  handleProps: Record<string, unknown>;
  onHandleKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  handleRef: (element: HTMLButtonElement | null) => void;
}

/** One exercise in the overview: tap to open it, drag the handle to move it. */
export function ExerciseRow({
  exercise,
  item,
  insteadOfName,
  dragging,
  offsetPx,
  rowRef,
  handleProps,
  onHandleKeyDown,
  handleRef,
}: ExerciseRowProps) {
  const progress = itemProgress(item);
  const detail = [
    progress.last ? t.lastSet(formatWeight(progress.last.weightGrams), progress.last.reps) : null,
    insteadOfName ? t.insteadOf(insteadOfName) : null,
  ].filter((part) => part !== null);

  return (
    <li
      ref={rowRef}
      className={`session-row${progress.done ? ' session-row--done' : ''}${dragging ? ' session-row--dragging' : ''}`}
      style={{ '--drag-y': `${offsetPx}px` } as React.CSSProperties}
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
      <button
        type="button"
        className="session-row__handle"
        aria-label={t.reorder(exercise.name)}
        aria-keyshortcuts="ArrowUp ArrowDown"
        ref={handleRef}
        onKeyDown={onHandleKeyDown}
        {...handleProps}
      >
        <GripIcon />
      </button>
    </li>
  );
}
