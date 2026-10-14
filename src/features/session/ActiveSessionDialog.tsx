import { useEffect, useRef } from 'react';
import { formatSessionDate } from '../../domain/date';
import { en } from '../../i18n/en';

const t = en.start;

export interface ActiveSessionDialogProps {
  open: boolean;
  /** The session that is already active; null while closed. */
  workoutName: string;
  date: string;
  checkedSets: number;
  /** True when it started on an earlier day than today. */
  stale: boolean;
  busy: boolean;
  onResume: () => void;
  onFinishAndStart: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Shown when starting a workout while another one is still active. Nothing is finished or
 * deleted without a tap here. An old session with no sets can be discarded; one with sets can
 * only be finished or continued.
 */
export function ActiveSessionDialog({
  open,
  workoutName,
  date,
  checkedSets,
  stale,
  busy,
  onResume,
  onFinishAndStart,
  onDiscard,
  onCancel,
}: ActiveSessionDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const canDiscard = stale && checkedSets === 0;

  return (
    <dialog ref={ref} className="dialog" onCancel={onCancel} aria-labelledby="active-session-title">
      <h2 id="active-session-title">{stale ? t.staleTitle : t.inProgressTitle}</h2>
      <p>
        {stale
          ? t.staleBody(workoutName, formatSessionDate(date), checkedSets)
          : t.inProgressBody(workoutName, checkedSets)}
      </p>
      {canDiscard && <p className="muted">{t.discardNote}</p>}

      <div className="dialog__actions dialog__actions--stack">
        <button type="button" className="button button--primary" disabled={busy} onClick={onResume}>
          {stale ? t.openIt : t.resume}
        </button>
        {stale && (
          <button type="button" className="button" disabled={busy} onClick={onFinishAndStart}>
            {t.finishAndStart}
          </button>
        )}
        {canDiscard && (
          <button
            type="button"
            className="button button--danger"
            disabled={busy}
            onClick={onDiscard}
          >
            {t.discard}
          </button>
        )}
        <button type="button" className="button" disabled={busy} onClick={onCancel}>
          {en.common.cancel}
        </button>
      </div>
    </dialog>
  );
}
