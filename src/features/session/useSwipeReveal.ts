import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { REVEAL_PX, settleOpen, swipeAxis, swipeOffset } from '../../domain/gesture';

interface Tracking {
  pointerId: number;
  startX: number;
  startY: number;
  wasOpen: boolean;
  axis: 'horizontal' | 'vertical' | null;
}

/**
 * Swipe a row to the left to reveal an action behind it (Pointer Events, no library).
 *
 * The direction is decided after about 10 px of movement. A vertical movement drops the gesture so
 * the list scrolls as usual (the row has `touch-action: pan-y`, so the browser keeps the vertical
 * pan and cancels the pointer). A horizontal one captures the pointer and the row follows the
 * finger; on release it snaps open or closed. Tapping anywhere outside the row closes it again.
 *
 * `rowRef` is the element the handlers go on; `contentRef` is the part that slides. A touch that
 * starts outside the content (on the revealed button, or in a dialog) is ignored.
 */
export function useSwipeReveal(
  rowRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  const [open, setOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const tracking = useRef<Tracking | null>(null);
  const justSwiped = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  // While open, a touch anywhere else closes the row.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !rowRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, rowRef]);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!(event.target instanceof Node) || !contentRef.current?.contains(event.target)) return;
    justSwiped.current = false;
    tracking.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      wasOpen: open,
      axis: null,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const t = tracking.current;
    if (!t || t.pointerId !== event.pointerId || t.axis === 'vertical') return;
    const dx = event.clientX - t.startX;
    const dy = event.clientY - t.startY;
    if (t.axis === null) {
      t.axis = swipeAxis(dx, dy);
      if (t.axis === 'vertical') {
        tracking.current = null;
        return;
      }
      if (t.axis === 'horizontal') {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Not supported (old browsers, jsdom): the gesture still works inside the row.
        }
      }
    }
    if (t.axis === 'horizontal') setDragOffset(swipeOffset(t.wasOpen, dx));
  }

  function finish(event: PointerEvent<HTMLElement>, cancelled: boolean) {
    const t = tracking.current;
    if (!t || t.pointerId !== event.pointerId) return;
    tracking.current = null;
    if (t.axis !== 'horizontal') return;
    justSwiped.current = true;
    setTimeout(() => {
      justSwiped.current = false;
    }, 100);
    const offset = swipeOffset(t.wasOpen, event.clientX - t.startX);
    setOpen(cancelled ? t.wasOpen : settleOpen(t.wasOpen, offset));
    setDragOffset(null);
  }

  /** After a swipe, or while the delete button is showing, a tap on the row only closes it. */
  function onClickCapture(event: React.MouseEvent<HTMLElement>) {
    const insideContent =
      event.target instanceof Node && contentRef.current?.contains(event.target) === true;
    if (!insideContent) return;
    if (justSwiped.current || open) {
      event.preventDefault();
      event.stopPropagation();
      justSwiped.current = false;
      setOpen(false);
    }
  }

  return {
    open,
    /** Open the row without a gesture (the Delete button was focused with the keyboard). */
    reveal: () => setOpen(true),
    close,
    dragging: dragOffset !== null,
    /** The content's horizontal offset in px: 0 closed, -REVEAL_PX open, or the live drag. */
    offset: dragOffset ?? (open ? -REVEAL_PX : 0),
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
      onClickCapture,
    },
  };
}
