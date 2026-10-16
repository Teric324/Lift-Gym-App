import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../db/instance';
import { moveDraftItem, moveDraftItemTo } from '../../db/repo/drafts';
import { shiftFor } from '../../domain/reorder';
import type { DraftItem, Exercise } from '../../domain/types';
import { en } from '../../i18n/en';
import { ExerciseRow } from './ExerciseRow';
import { useDragReorder } from './useDragReorder';

const t = en.session;

interface ExerciseListProps {
  sessionId: string;
  /** The visible exercises, in order. */
  items: DraftItem[];
  exercises: Map<string, Exercise>;
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * The overview list of the exercises of the workout in progress. Rows can be reordered by
 * dragging the handle, or with the arrow keys while the handle has focus. The new order is
 * written to the draft; until the database has caught up the list shows the dropped order, so
 * the row does not jump back for a moment.
 */
export function ExerciseList({ sessionId, items, exercises }: ExerciseListProps) {
  const rows = useMemo(
    () => items.filter((item) => exercises.has(item.exerciseId)),
    [items, exercises],
  );
  const currentIds = useMemo(() => rows.map((item) => item.exerciseId), [rows]);
  const [pending, setPending] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);

  // The dropped order stays on screen until the stored order matches it.
  if (pending && sameOrder(pending, currentIds)) setPending(null);

  const shownIds =
    pending &&
    pending.length === currentIds.length &&
    pending.every((id) => currentIds.includes(id))
      ? pending
      : currentIds;
  const byId = new Map(rows.map((item) => [item.exerciseId, item]));
  const shown = shownIds.map((id) => byId.get(id)!);

  // Moving a row in the DOM drops its focus; give it back after a keyboard move.
  useLayoutEffect(() => {
    const id = refocus.current;
    if (id) {
      refocus.current = null;
      handles.current.get(id)?.focus();
    }
  });

  async function save(action: () => Promise<unknown>, optimistic: string[] | null) {
    setError(null);
    setPending(optimistic);
    try {
      await action();
    } catch {
      setPending(null);
      setError(t.editFailed);
    }
  }

  const drag = useDragReorder(shownIds, (id, to) => {
    const next = shownIds.filter((other) => other !== id);
    next.splice(to, 0, id);
    void save(() => moveDraftItemTo(db, sessionId, id, to), next);
  });

  function onHandleKeyDown(id: string, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const from = shownIds.indexOf(id);
    const to = from + (event.key === 'ArrowUp' ? -1 : 1);
    if (from === -1 || to < 0 || to >= shownIds.length) return;
    refocus.current = id;
    void save(() => moveDraftItem(db, sessionId, id, event.key === 'ArrowUp' ? -1 : 1), null);
  }

  const dragState = drag.state;

  return (
    <>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <ol className={`session-list${dragState ? ' session-list--dragging' : ''}`}>
        {shown.map((item, index) => {
          const exercise = exercises.get(item.exerciseId)!;
          const insteadOf =
            item.origin === 'replacement' && item.replacesExerciseId
              ? (exercises.get(item.replacesExerciseId)?.name ?? null)
              : null;
          const dragging = dragState?.id === item.exerciseId;
          const offsetPx = dragState
            ? dragging
              ? dragState.dy
              : shiftFor(index, dragState.from, dragState.to) * dragState.height
            : 0;
          return (
            <ExerciseRow
              key={item.exerciseId}
              exercise={exercise}
              item={item}
              insteadOfName={insteadOf}
              dragging={dragging}
              offsetPx={offsetPx}
              rowRef={drag.rowRef(item.exerciseId)}
              handleProps={drag.handleProps(item.exerciseId)}
              onHandleKeyDown={(event) => onHandleKeyDown(item.exerciseId, event)}
              handleRef={(element) => {
                if (element) handles.current.set(item.exerciseId, element);
                else handles.current.delete(item.exerciseId);
              }}
            />
          );
        })}
      </ol>
    </>
  );
}
