import { Link } from 'react-router';
import { formatSessionDate, localTimeString } from '../../domain/date';
import { isStaleSession } from '../../domain/session-state';
import { en } from '../../i18n/en';
import { useSessionView } from './useSessionView';

const t = en.start;

/** A line at the top of the workout list when a session is open, with a way back into it. */
export function ResumeBanner() {
  const view = useSessionView();
  if (!view) return null;

  const { session, workout, today } = view;
  const name = workout?.name ?? en.session.title;
  const stale = isStaleSession(session, today);

  return (
    <div className="notice resume-banner" role="status">
      <span>
        {stale
          ? t.bannerStale(name, formatSessionDate(session.date))
          : t.bannerToday(name, localTimeString(session.startedAt))}
      </span>{' '}
      <Link className="button button--small button--primary" to="/session">
        {stale ? t.bannerOpen : t.bannerResume}
      </Link>
    </div>
  );
}
