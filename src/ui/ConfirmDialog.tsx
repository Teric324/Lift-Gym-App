import { useEffect, useRef, type ReactNode } from 'react';
import { en } from '../i18n/en';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A modal question. Uses the native <dialog>, so focus handling and Escape come for free. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = en.common.cancel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onCancel={onCancel} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      {children}
      <div className="dialog__actions">
        <button type="button" className="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${danger ? 'button--danger' : 'button--primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
