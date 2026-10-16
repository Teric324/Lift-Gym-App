import type { KeyboardEvent, PointerEvent } from 'react';
import { GripIcon } from '../icons';

export interface DragHandleProps {
  /** Accessible name, e.g. "Reorder Bench press". */
  label: string;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  handleRef: (element: HTMLButtonElement | null) => void;
}

/** What the hook hands to a handle (everything but the label). */
export type DragHandleBindings = Omit<DragHandleProps, 'label'>;

/** The grip that moves a row: drag it, or use the arrow keys when it has focus. */
export function DragHandle({ label, handleRef, ...handlers }: DragHandleProps) {
  return (
    <button
      type="button"
      className="drag-handle"
      aria-label={label}
      aria-keyshortcuts="ArrowUp ArrowDown"
      ref={handleRef}
      {...handlers}
    >
      <GripIcon />
    </button>
  );
}
