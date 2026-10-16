import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { dropIndex } from '../../domain/reorder';

/** Distance (px) from the scroll area's top or bottom edge where dragging starts to scroll it. */
const EDGE_PX = 72;
/** Fastest auto-scroll, px per frame. */
const MAX_SCROLL_PX = 14;

export interface DragState {
  id: string;
  from: number;
  /** Where the row would land if dropped now. */
  to: number;
  /** How far the dragged row has moved from its resting place (px, scroll included). */
  dy: number;
  /** The dragged row's height: how far the rows it passes move out of the way (px). */
  height: number;
}

interface Session {
  id: string;
  from: number;
  pointerId: number;
  startY: number;
  startScroll: number;
  centers: number[];
  height: number;
  clientY: number;
  scroller: HTMLElement | null;
  velocity: number;
  frame: number;
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return node;
  }
  return null;
}

/**
 * Drag-to-reorder for a vertical list, with Pointer Events (no library). Spread `handleProps(id)`
 * on each row's drag handle and register each row's element with `rowRef(id)`.
 *
 * Pressing the handle captures the pointer; the row then follows the finger (`state.dy`) while
 * `state.to` tells where it would land, so the other rows can show the gap. Lifting the finger
 * calls `onDrop(id, to)` when the place changed; a cancelled pointer drops nothing. Near the top
 * or bottom edge of the scrolling ancestor the list scrolls by itself.
 */
export function useDragReorder(ids: readonly string[], onDrop: (id: string, to: number) => void) {
  const [state, setState] = useState<DragState | null>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const session = useRef<Session | null>(null);
  const latest = useRef<DragState | null>(null);
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const rowRef = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) rows.current.set(id, element);
      else rows.current.delete(id);
    },
    [],
  );

  const update = useCallback(() => {
    const s = session.current;
    if (!s) return;
    const scrolled = (s.scroller?.scrollTop ?? 0) - s.startScroll;
    const dy = s.clientY - s.startY + scrolled;
    const to = dropIndex(s.centers, s.from, s.centers[s.from]! + dy);
    latest.current = { id: s.id, from: s.from, to, dy, height: s.height };
    setState(latest.current);
  }, []);

  const stopScrolling = useCallback(() => {
    const s = session.current;
    if (s) {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
    }
  }, []);

  const startScrolling = useCallback(() => {
    const s = session.current;
    if (!s || s.frame !== 0) return;
    const step = () => {
      const current = session.current;
      if (!current || !current.scroller || current.velocity === 0) {
        if (current) current.frame = 0;
        return;
      }
      current.scroller.scrollTop += current.velocity;
      update();
      current.frame = requestAnimationFrame(step);
    };
    s.frame = requestAnimationFrame(step);
  }, [update]);

  // Never leave a frame running after the list goes away.
  useEffect(() => stopScrolling, [stopScrolling]);

  const end = useCallback(
    (cancelled: boolean) => {
      const s = session.current;
      if (!s) return;
      stopScrolling();
      session.current = null;
      const dropped = latest.current;
      latest.current = null;
      setState(null);
      if (!cancelled && dropped && dropped.to !== dropped.from) onDrop(dropped.id, dropped.to);
    },
    [onDrop, stopScrolling],
  );

  function handleProps(id: string) {
    return {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const from = idsRef.current.indexOf(id);
        const own = rows.current.get(id);
        if (from === -1 || !own || session.current) return;
        const scroller = scrollParent(own);
        const scrollTop = scroller?.scrollTop ?? 0;
        const centers = idsRef.current.map((rowId) => {
          const rect = rows.current.get(rowId)?.getBoundingClientRect();
          return rect ? rect.top + rect.height / 2 + scrollTop : 0;
        });
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Not supported (jsdom): the events still arrive while the pointer is over the handle.
        }
        session.current = {
          id,
          from,
          pointerId: event.pointerId,
          startY: event.clientY,
          startScroll: scrollTop,
          centers,
          height: own.getBoundingClientRect().height,
          clientY: event.clientY,
          scroller,
          velocity: 0,
          frame: 0,
        };
        update();
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const s = session.current;
        if (!s || s.pointerId !== event.pointerId) return;
        s.clientY = event.clientY;
        let velocity = 0;
        if (s.scroller) {
          const box = s.scroller.getBoundingClientRect();
          const intoTop = box.top + EDGE_PX - event.clientY;
          const intoBottom = event.clientY - (box.bottom - EDGE_PX);
          if (intoTop > 0) velocity = -Math.min(1, intoTop / EDGE_PX) * MAX_SCROLL_PX;
          else if (intoBottom > 0) velocity = Math.min(1, intoBottom / EDGE_PX) * MAX_SCROLL_PX;
        }
        s.velocity = velocity;
        update();
        if (velocity !== 0) startScrolling();
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        if (session.current?.pointerId === event.pointerId) end(false);
      },
      onPointerCancel(event: PointerEvent<HTMLElement>) {
        if (session.current?.pointerId === event.pointerId) end(true);
      },
    };
  }

  return { state, rowRef, handleProps };
}
