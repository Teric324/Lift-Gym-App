import { useRef, useState } from 'react';
import { db } from '../../db/instance';
import {
  checkDraftRow,
  removeDraftRow,
  uncheckDraftRow,
  updateDraftRow,
} from '../../db/repo/drafts';
import type { DraftRow, Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { RepsField } from './RepsField';
import { useSwipeReveal } from './useSwipeReveal';
import { WeightField } from './WeightField';

const t = en.session;

interface SetRowProps {
  sessionId: string;
  exercise: Exercise;
  row: DraftRow;
  number: number;
}

/**
 * One planned or done set, on one line: number, weight (typed), reps, check. Every
 * change is written to the database at once. Ticking the check button creates the stored set;
 * ticking it again removes it. Swiping the row to the left shows a Delete button behind it (also
 * reachable with the keyboard or a screen reader, where focusing it slides the row open).
 */
export function SetRow({ sessionId, exercise, row, number }: SetRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swipe = useSwipeReveal(rowRef, contentRef);
  const checked = row.checkedSetId !== null;
  const complete = row.weightGrams !== null && row.reps !== null;

  const remove = () => removeDraftRow(db, sessionId, exercise.id, row.id);

  const toggle = () =>
    checked
      ? uncheckDraftRow(db, sessionId, exercise.id, row.id)
      : checkDraftRow(db, sessionId, exercise.id, row.id);

  return (
    <li ref={rowRef} className={`set-swipe${swipe.open ? ' set-swipe--open' : ''}`} {...swipe.bind}>
      <button
        type="button"
        className="set-swipe__delete"
        aria-label={t.deleteSet(number)}
        onFocus={swipe.reveal}
        onBlur={swipe.close}
        onClick={() => {
          swipe.close();
          if (checked) setConfirmingRemove(true);
          else void remove();
        }}
      >
        {t.delete}
      </button>
      <div
        ref={contentRef}
        className={`set-row${checked ? ' set-row--done' : ''}${swipe.offset !== 0 ? ' set-row--shifted' : ''}${swipe.dragging ? ' set-row--dragging' : ''}`}
        style={{ '--swipe-x': `${swipe.offset}px` } as React.CSSProperties}
      >
        <span className="set-row__number">{number}</span>
        <WeightField
          valueGrams={row.weightGrams}
          onChange={(weightGrams) =>
            updateDraftRow(db, sessionId, exercise.id, row.id, { weightGrams })
          }
        />
        <span className="set-row__times" aria-hidden="true">
          ×
        </span>
        <RepsField
          value={row.reps}
          onChange={(reps) => updateDraftRow(db, sessionId, exercise.id, row.id, { reps })}
        />
        <button
          type="button"
          className={`set-row__check${checked ? ' set-row__check--done' : ''}`}
          aria-pressed={checked}
          aria-label={checked ? t.uncheck : t.check}
          disabled={!checked && !complete}
          onClick={() => void toggle()}
        >
          {checked ? '✓' : ''}
        </button>
      </div>
      <ConfirmDialog
        open={confirmingRemove}
        title={t.removeCheckedTitle}
        confirmLabel={en.common.remove}
        danger
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={async () => {
          await remove();
          setConfirmingRemove(false);
        }}
      >
        <p>{t.removeCheckedBody}</p>
      </ConfirmDialog>
    </li>
  );
}
