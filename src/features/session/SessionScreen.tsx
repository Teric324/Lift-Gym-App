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
import { ExerciseList } from './ExerciseList';
import { FinishBar } from './FinishBar';
import './session.css';
import { useSessionView } from './useSessionView';
import { DisplayTitle } from '../../ui/DisplayTitle';

const t = en.session;

export function SessionScreen() {
  const view = useSessionView();
  const registry = useLiveQuery(() => listExercises(db, { includeArchived: true }), []);

  if (view === undefined || registry === undefined) return <p>{en.settings.loading}</p>;
  if (view === null) {
    return (
      <section>
        <DisplayTitle>{t.title}</DisplayTitle>
        <EmptyState>{t.none}</EmptyState>
        <Link className="button" to="/">
          {t.goToWorkouts}
        </Link>
      </section>
    );
  }

  const { session, draft } = view;
  const byId = new Map(registry.map((exercise) => [exercise.id, exercise]));
  const items = visibleItems(draft.items);
  const skipped = draft.items.filter((item) => item.skipped);
  const rows = items.flatMap((item) => item.rows);
  const doneSets = rows.filter((row) => row.checkedSetId !== null).length;

  return (
    <section>
      <DisplayTitle>{view.workout?.name ?? t.title}</DisplayTitle>
      <p className="muted">
        {t.started(formatSessionDate(session.date), localTimeString(session.startedAt))}
        {rows.length > 0 && ` · ${t.progress(doneSets, rows.length)}`}
      </p>

      {items.length === 0 && <EmptyState>{t.noExercises}</EmptyState>}

      <ExerciseList sessionId={session.id} items={items} exercises={byId} />

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
