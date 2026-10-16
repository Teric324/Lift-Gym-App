import { Link } from 'react-router';
import { formatSessionDate, localTimeString } from '../../domain/date';
import { isStaleSession } from '../../domain/session-state';
import { en } from '../../i18n/en';
import { BoltIcon } from '../../ui/icons';
import { useSessionView } from './useSessionView';

const t = en.start;

/** A card at the top of the workout list when a session is open, with a way back into it. */
export function ResumeBanner() {
  const view = useSessionView();
  if (!view) return null;

  const { session, workout, today } = view;
  const name = workout?.name ?? en.session.title;
  const stale = isStaleSession(session, today);

  return (
    <div className="resume-banner" role="status">
      <span className="resume-banner__icon">
        <BoltIcon />
      </span>
      <span className="resume-banner__text">
        <span className="resume-banner__title">{stale ? t.bannerStaleTitle : t.bannerTitle}</span>
        <span className="resume-banner__meta">
          {stale
            ? t.bannerStaleMeta(name, formatSessionDate(session.date))
            : t.bannerMeta(name, localTimeString(session.startedAt))}
        </span>
      </span>
      <Link className="button button--small button--primary" to="/session">
        {stale ? t.bannerOpen : t.bannerResume}
      </Link>
    </div>
  );
}
