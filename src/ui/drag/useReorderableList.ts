import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { shiftFor } from '../../domain/reorder';
import type { DragHandleBindings } from './DragHandle';
import { useDragReorder } from './useDragReorder';

/** What a row element needs: spread `ref`, `style` and the dragged flag onto the `<li>`. */
export interface ReorderRowProps {
  ref: (element: HTMLElement | null) => void;
  style: CSSProperties;
  dragging: boolean;
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * The one reorder pattern of the app: drag a row by its handle (`<DragHandle/>`), or press the
 * arrow keys while the handle has focus. `ids` is the stored order; `move(id, to)` writes the
 * new place. Until the database has caught up, `shownIds` holds the dropped order, so the row
 * does not jump back for a moment. A failed write sets `failed`.
 */
export function useReorderableList(
  ids: readonly string[],
  move: (id: string, to: number) => Promise<unknown>,
) {
  const [pending, setPending] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);

  // The dropped order stays on screen until the stored order matches it.
  if (pending && sameOrder(pending, ids)) setPending(null);

  const shownIds = useMemo(
    () =>
      pending && pending.length === ids.length && pending.every((id) => ids.includes(id))
        ? pending
        : [...ids],
    [pending, ids],
  );

  // Moving a row in the DOM drops its focus; give it back after a keyboard move.
  useLayoutEffect(() => {
    const id = refocus.current;
    if (id) {
      refocus.current = null;
      handles.current.get(id)?.focus();
    }
  });

  async function save(id: string, to: number, optimistic: string[] | null) {
    setFailed(false);
    setPending(optimistic);
    try {
      await move(id, to);
    } catch {
      setPending(null);
      setFailed(true);
    }
  }

  const drag = useDragReorder(shownIds, (id, to) => {
    const next = shownIds.filter((other) => other !== id);
    next.splice(to, 0, id);
    void save(id, to, next);
  });

  function onKeyDown(id: string, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const from = shownIds.indexOf(id);
    const to = from + (event.key === 'ArrowUp' ? -1 : 1);
    if (from === -1 || to < 0 || to >= shownIds.length) return;
    refocus.current = id;
    void save(id, to, null);
  }

  const dragState = drag.state;

  return {
    shownIds,
    failed,
    /** True while a row is being dragged (put on the list element). */
    dragging: dragState !== null,
    /** Spread on the row element (`<li>`): its ref, offset and dragged state. */
    rowProps(id: string, index: number): ReorderRowProps {
      const isDragged = dragState?.id === id;
      const offsetPx = dragState
        ? isDragged
          ? dragState.dy
          : shiftFor(index, dragState.from, dragState.to) * dragState.height
        : 0;
      return {
        ref: drag.rowRef(id),
        style: { '--drag-y': `${offsetPx}px` } as CSSProperties,
        dragging: isDragged,
      };
    },
    /** Spread on `<DragHandle/>`. */
    handleProps(id: string): DragHandleBindings {
      return {
        ...drag.handleProps(id),
        onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onKeyDown(id, event),
        handleRef: (element: HTMLButtonElement | null) => {
          if (element) handles.current.set(id, element);
          else handles.current.delete(id);
        },
      };
    },
  };
}
