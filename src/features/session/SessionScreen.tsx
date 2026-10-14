import { Link } from 'react-router';
import { formatSessionDate, localTimeString } from '../../domain/date';
import { en } from '../../i18n/en';
import './session.css';
import { EmptyState } from '../../ui/EmptyState';
import { FinishBar } from './FinishBar';
import { SessionExerciseCard } from './SessionExerciseCard';
import { useSessionView } from './useSessionView';

const t = en.session;

export function SessionScreen() {
  const view = useSessionView();

  if (view === undefined) return <p>{en.settings.loading}</p>;
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

  const { session, workout, draft, exercises } = view;
  const items = draft.items.filter((item) => !item.skipped);

  return (
    <section>
      <h1>{workout?.name ?? t.title}</h1>
      <p className="muted">
        {t.started(formatSessionDate(session.date), localTimeString(session.startedAt))}
      </p>

      {items.length === 0 && <EmptyState>{t.noExercises}</EmptyState>}

      {items.map((item) => {
        const exercise = exercises.get(item.exerciseId);
        if (!exercise) return null;
        return (
          <SessionExerciseCard
            key={item.exerciseId}
            sessionId={session.id}
            exercise={exercise}
            item={item}
          />
        );
      })}

      <FinishBar sessionId={session.id} draft={draft} />
    </section>
  );
}
