import { useState } from 'react';
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
import { WeightField } from './WeightField';

const t = en.session;

interface SetRowProps {
  sessionId: string;
  exercise: Exercise;
  row: DraftRow;
  number: number;
}

/**
 * One planned or done set. Every change is written to the database at once. Ticking the
 * check button creates the stored set; ticking it again removes it.
 */
export function SetRow({ sessionId, exercise, row, number }: SetRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const checked = row.checkedSetId !== null;
  const complete = row.weightGrams !== null && row.reps !== null;

  const remove = () => removeDraftRow(db, sessionId, exercise.id, row.id);

  const toggle = () =>
    checked
      ? uncheckDraftRow(db, sessionId, exercise.id, row.id)
      : checkDraftRow(db, sessionId, exercise.id, row.id);

  return (
    <li className={`set-row${checked ? ' set-row--done' : ''}`}>
      <span className="set-row__number">{number}</span>
      <WeightField
        valueGrams={row.weightGrams}
        stepGrams={exercise.stepGrams}
        lastGrams={row.weightGrams}
        onChange={(weightGrams) =>
          updateDraftRow(db, sessionId, exercise.id, row.id, { weightGrams })
        }
      />
      <span className="set-row__unit">{t.kg} ×</span>
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
      <button
        type="button"
        className="button button--small set-row__remove"
        aria-label={t.removeSet(number)}
        onClick={() => (checked ? setConfirmingRemove(true) : void remove())}
      >
        ✕
      </button>
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
