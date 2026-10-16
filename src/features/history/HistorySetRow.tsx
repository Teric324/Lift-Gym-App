import { db } from '../../db/instance';
import { updateSetValues } from '../../db/repo/sets';
import { formatSetLine } from '../../domain/history';
import type { SessionSet } from '../../domain/types';
import { en } from '../../i18n/en';
import { RepsField } from '../session/RepsField';
import { WeightField } from '../session/WeightField';

const t = en.history;

interface HistorySetRowProps {
  set: SessionSet;
  number: number;
  editing: boolean;
  onRemove: () => void;
}

/**
 * One stored set of a finished workout. Read-only as text; in edit mode the weight and
 * reps fields of the live workout are used, and every change is saved at once.
 */
export function HistorySetRow({ set, number, editing, onRemove }: HistorySetRowProps) {
  if (!editing) {
    return (
      <li className="history-set">
        <span className="history-set__number">{number}</span>
        <span className="history-set__line">{formatSetLine(set)}</span>
      </li>
    );
  }

  return (
    <li className="history-set history-set--editing">
      <span className="history-set__number">{number}</span>
      <WeightField
        valueGrams={set.weightGrams}
        onChange={(weightGrams) => updateSetValues(db, set.id, { weightGrams, reps: set.reps })}
      />
      <span className="set-row__times" aria-hidden="true">
        ×
      </span>
      <RepsField
        showSteppers
        value={set.reps}
        onChange={(reps) => updateSetValues(db, set.id, { weightGrams: set.weightGrams, reps })}
      />
      <button
        type="button"
        className="button button--small set-row__remove"
        aria-label={t.removeSet(number)}
        onClick={onRemove}
      >
        ✕
      </button>
    </li>
  );
}
