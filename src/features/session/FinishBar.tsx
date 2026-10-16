import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../../db/instance';
import { discardEmptySession, finishSession } from '../../db/repo/sessions';
import type { SessionDraft } from '../../domain/types';
import { en } from '../../i18n/en';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

const t = en.session;

/** Counts the rows of the visible exercises: how many are checked and how many are not. */
export function countRows(draft: SessionDraft): { checked: number; unchecked: number } {
  const rows = draft.items.filter((item) => !item.skipped).flatMap((item) => item.rows);
  const checked = rows.filter((row) => row.checkedSetId !== null).length;
  return { checked, unchecked: rows.length - checked };
}

/**
 * Ends the workout. With nothing checked the only way out is Discard (an empty session would
 * only clutter the history). With unchecked rows left, Finish asks first, because those rows
 * are dropped with the draft.
 */
export function FinishBar({ sessionId, draft }: { sessionId: string; draft: SessionDraft }) {
  const navigate = useNavigate();
  const { checked, unchecked } = countRows(draft);
  const [confirming, setConfirming] = useState<'finish' | 'discard' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    try {
      await finishSession(db, sessionId, Date.now());
      setConfirming(null);
      navigate('/');
    } catch {
      setConfirming(null);
      setError(t.finishFailed);
    }
  }

  async function discard() {
    try {
      await discardEmptySession(db, sessionId);
      setConfirming(null);
      navigate('/');
    } catch {
      setConfirming(null);
      setError(t.finishFailed);
    }
  }

  return (
    <div className="finish-bar">
      {checked === 0 ? (
        <button
          type="button"
          className="button button--danger button--block"
          onClick={() => setConfirming('discard')}
        >
          {t.discard}
        </button>
      ) : (
        <button
          type="button"
          className="button button--primary button--block"
          onClick={() => (unchecked > 0 ? setConfirming('finish') : void finish())}
        >
          {t.finish}
        </button>
      )}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming === 'finish'}
        title={t.finishTitle}
        confirmLabel={t.finishConfirm}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void finish()}
      >
        <p>{t.finishBody(unchecked)}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === 'discard'}
        title={t.discardTitle}
        confirmLabel={t.discardConfirm}
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => void discard()}
      >
        <p>{t.discardBody}</p>
      </ConfirmDialog>
    </div>
  );
}
