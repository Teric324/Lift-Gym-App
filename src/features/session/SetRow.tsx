import type { DraftRow, Exercise } from '../../domain/types';
import { formatWeight } from '../../domain/weight';
import { en } from '../../i18n/en';

const t = en.session;

interface SetRowProps {
  sessionId: string;
  exercise: Exercise;
  row: DraftRow;
  number: number;
}

/** One planned or done set. Read-only for now; made interactive in the next step. */
export function SetRow({ row, number }: SetRowProps) {
  const checked = row.checkedSetId !== null;
  return (
    <li className={`set-row${checked ? ' set-row--done' : ''}`}>
      <span className="set-row__number">{number}</span>
      <span className="set-row__values">
        {row.weightGrams === null ? '—' : formatWeight(row.weightGrams)} {t.kg} ×{' '}
        {row.reps === null ? '—' : row.reps}
      </span>
      <span className="set-row__state" aria-label={checked ? t.uncheck : t.check}>
        {checked ? '✓' : '○'}
      </span>
    </li>
  );
}
