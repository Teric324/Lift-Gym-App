import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../../db/instance';
import { unskipDraftItem } from '../../db/repo/drafts';
import { listExercises } from '../../db/repo/exercises';
import { formatSessionDate, localTimeString } from '../../domain/date';
import { visibleItems } from '../../domain/session-items';
import { en } from '../../i18n/en';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { EmptyState } from '../../ui/EmptyState';
import { AddExerciseButton } from './AddExerciseButton';
import { FinishBar } from './FinishBar';
import { SessionExerciseCard } from './SessionExerciseCard';
import './session.css';
import { useSessionView } from './useSessionView';

const t = en.session;

export function SessionScreen() {
  const view = useSessionView();
  const registry = useLiveQuery(() => listExercises(db, { includeArchived: true }), []);

  if (view === undefined || registry === undefined) return <p>{en.settings.loading}</p>;
  if (view === null) {
    return (
      <section>
        <h1>{t.title}</h1>
        <EmptyState>{t.none}</EmptyState>
        <Link className="button" to="/">
          {t.goToWorkouts}
        </Link>
      </section>
    );
  }

  const { session, workout, draft } = view;
  const byId = new Map(registry.map((exercise) => [exercise.id, exercise]));
  const items = visibleItems(draft.items);
  const skipped = draft.items.filter((item) => item.skipped);
  const inSession = new Set(draft.items.map((item) => item.exerciseId));
  const replacementChoices = registry.filter((e) => !e.archived && !inSession.has(e.id));
  const routineExerciseIds = workout?.exerciseIds ?? [];

  return (
    <section>
      <h1>{workout?.name ?? t.title}</h1>
      <p className="muted">
        {t.started(formatSessionDate(session.date), localTimeString(session.startedAt))}
      </p>

      {items.length === 0 && <EmptyState>{t.noExercises}</EmptyState>}

      {items.map((item, index) => {
        const exercise = byId.get(item.exerciseId);
        if (!exercise) return null;
        const insteadOf =
          item.origin === 'replacement' && item.replacesExerciseId
            ? (byId.get(item.replacesExerciseId)?.name ?? null)
            : null;
        return (
          <SessionExerciseCard
            key={item.exerciseId}
            sessionId={session.id}
            exercise={exercise}
            item={item}
            insteadOfName={insteadOf}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
            routineExerciseIds={routineExerciseIds}
            replacementChoices={replacementChoices}
          />
        );
      })}

      <AddExerciseButton sessionId={session.id} draft={draft} />

      {skipped.length > 0 && (
        <CollapsibleSection title={t.skippedHeading(skipped.length)}>
          <ul className="list skipped-list">
            {skipped.map((item) => (
              <li key={item.exerciseId} className="list__row list__row--muted">
                <span className="list__main">
                  <span className="list__title">
                    {byId.get(item.exerciseId)?.name ?? item.exerciseId}
                  </span>
                </span>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => void unskipDraftItem(db, session.id, item.exerciseId)}
                >
                  {t.bringBack}
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      <FinishBar sessionId={session.id} draft={draft} />
    </section>
  );
}
