import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../../db/instance';
import {
  discardEmptySession,
  finishSessionAtLastSet,
  getActiveSession,
  getSessionSummary,
  startSession,
} from '../../db/repo/sessions';
import { getWorkout } from '../../db/repo/workouts';
import { localDateString } from '../../domain/date';
import { isStaleSession } from '../../domain/session-state';
import type { Workout } from '../../domain/types';
import { en } from '../../i18n/en';
import { ActiveSessionDialog, type ActiveSessionDialogProps } from './ActiveSessionDialog';

const t = en.start;

type Blocking = Pick<ActiveSessionDialogProps, 'workoutName' | 'date' | 'checkedSets' | 'stale'> & {
  sessionId: string;
};

/** Starts a session of `workout`. Handles a session that is already active (see the dialog). */
export function StartWorkoutButton({ workout }: { workout: Workout }) {
  const navigate = useNavigate();
  const [blocking, setBlocking] = useState<Blocking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty = workout.exerciseIds.length === 0;

  async function begin() {
    await startSession(db, workout.id);
    navigate('/session');
  }

  async function onStart() {
    setError(null);
    setBusy(true);
    try {
      const active = await getActiveSession(db);
      if (!active) {
        await begin();
        return;
      }
      const [summary, activeWorkout] = await Promise.all([
        getSessionSummary(db, active.id),
        getWorkout(db, active.workoutId),
      ]);
      setBlocking({
        sessionId: active.id,
        workoutName: activeWorkout?.name ?? en.session.title,
        date: active.date,
        checkedSets: summary.checkedSets,
        stale: isStaleSession(active, localDateString(Date.now())),
      });
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setBlocking(null);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button button--primary button--small"
        disabled={busy || empty}
        title={empty ? t.noExercises : undefined}
        onClick={() => void onStart()}
      >
        {t.button}
      </button>
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}

      <ActiveSessionDialog
        open={blocking !== null}
        workoutName={blocking?.workoutName ?? ''}
        date={blocking?.date ?? ''}
        checkedSets={blocking?.checkedSets ?? 0}
        stale={blocking?.stale ?? false}
        busy={busy}
        onCancel={() => setBlocking(null)}
        onResume={() => {
          setBlocking(null);
          navigate('/session');
        }}
        onFinishAndStart={() =>
          void run(async () => {
            if (!blocking) return;
            await finishSessionAtLastSet(db, blocking.sessionId);
            await begin();
          })
        }
        onDiscard={() =>
          void run(async () => {
            if (!blocking) return;
            await discardEmptySession(db, blocking.sessionId);
            await begin();
          })
        }
      />
    </>
  );
}
