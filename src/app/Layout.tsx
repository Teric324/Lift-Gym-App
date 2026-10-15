import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { applyUpdate, useUpdateAvailable } from '../features/pwa/update';
import { useActiveSession } from '../features/session/useActiveSession';
import { en } from '../i18n/en';
import { BoltIcon, HistoryIcon, ListIcon, SlidersIcon } from '../ui/icons';
import { Wordmark } from '../ui/Wordmark';

function Tab({
  to,
  end,
  icon,
  label,
}: {
  to: string;
  end?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <NavLink className="tabbar__link" to={to} end={end}>
      {icon}
      <span className="tabbar__label">{label}</span>
    </NavLink>
  );
}

export function Layout() {
  const updateAvailable = useUpdateAvailable();
  const activeSession = useActiveSession();
  // Never swap the app version under a workout in progress. While the session is still being
  // read (undefined) the button stays hidden as well.
  const canUpdateNow = updateAvailable && activeSession === null;

  return (
    <>
      <header className="app-header">
        <Link className="app-header__brand" to="/" aria-label={en.nav.home}>
          <Wordmark height={22} />
        </Link>
        {canUpdateNow && (
          <button type="button" className="update-button" onClick={applyUpdate}>
            {en.update.available}
          </button>
        )}
      </header>
      {updateAvailable && activeSession && (
        <p className="update-note" role="status">
          {en.update.afterWorkout}
        </p>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label={en.nav.label}>
        <Tab to="/" end icon={<BoltIcon />} label={en.nav.home} />
        <Tab to="/history" icon={<HistoryIcon />} label={en.nav.history} />
        <Tab to="/exercises" icon={<ListIcon />} label={en.nav.exercises} />
        <Tab to="/settings" icon={<SlidersIcon />} label={en.nav.settings} />
      </nav>
    </>
  );
}
