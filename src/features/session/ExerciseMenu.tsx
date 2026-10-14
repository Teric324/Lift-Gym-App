import { useEffect, useRef } from 'react';
import { en } from '../../i18n/en';

const t = en.session;

interface ExerciseMenuProps {
  open: boolean;
  exerciseName: string;
  onReplace: () => void;
  onSkip: () => void;
  onClose: () => void;
}

/** The actions of one exercise in the workout. A small modal list, like the other dialogs. */
export function ExerciseMenu({
  open,
  exerciseName,
  onReplace,
  onSkip,
  onClose,
}: ExerciseMenuProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={t.menuTitle(exerciseName)}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <h2>{exerciseName}</h2>
      <div className="dialog__actions dialog__actions--stack">
        <button type="button" className="button" onClick={onReplace}>
          {t.menuReplace}
        </button>
        <button type="button" className="button button--danger" onClick={onSkip}>
          {t.menuSkip}
        </button>
        <button type="button" className="button" onClick={onClose}>
          {t.menuClose}
        </button>
      </div>
    </dialog>
  );
}
