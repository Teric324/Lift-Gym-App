import { useMemo } from 'react';
import { db } from '../../db/instance';
import { moveDraftItemTo } from '../../db/repo/drafts';
import type { DraftItem, Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { useReorderableList } from '../../ui/drag/useReorderableList';
import { ExerciseRow } from './ExerciseRow';

const t = en.session;

interface ExerciseListProps {
  sessionId: string;
  /** The visible exercises, in order. */
  items: DraftItem[];
  exercises: Map<string, Exercise>;
}

/**
 * The overview list of the exercises of the workout in progress. Rows are reordered with the
 * shared drag handle; the new order is written to the draft.
 */
export function ExerciseList({ sessionId, items, exercises }: ExerciseListProps) {
  const rows = useMemo(
    () => items.filter((item) => exercises.has(item.exerciseId)),
    [items, exercises],
  );
  const currentIds = useMemo(() => rows.map((item) => item.exerciseId), [rows]);
  const list = useReorderableList(currentIds, (id, to) => moveDraftItemTo(db, sessionId, id, to));

  const byId = new Map(rows.map((item) => [item.exerciseId, item]));
  const shown = list.shownIds.map((id) => byId.get(id)!);

  return (
    <>
      {list.failed && (
        <p className="field__error" role="alert">
          {t.editFailed}
        </p>
      )}
      <ol className={`session-list${list.dragging ? ' drag-list--dragging' : ''}`}>
        {shown.map((item, index) => {
          const exercise = exercises.get(item.exerciseId)!;
          const insteadOf =
            item.origin === 'replacement' && item.replacesExerciseId
              ? (exercises.get(item.replacesExerciseId)?.name ?? null)
              : null;
          return (
            <ExerciseRow
              key={item.exerciseId}
              exercise={exercise}
              item={item}
              insteadOfName={insteadOf}
              row={list.rowProps(item.exerciseId, index)}
              handle={list.handleProps(item.exerciseId)}
            />
          );
        })}
      </ol>
    </>
  );
}
