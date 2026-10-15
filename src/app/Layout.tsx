import { NavLink, Outlet } from 'react-router';
import { useActiveSession } from '../features/session/useActiveSession';
import { applyUpdate, useUpdateAvailable } from '../features/pwa/update';
import { en } from '../i18n/en';

export function Layout() {
  const updateAvailable = useUpdateAvailable();
  const activeSession = useActiveSession();
  // Never swap the app version under a workout in progress. While the session is still being
  // read (undefined) the button stays hidden as well.
  const canUpdateNow = updateAvailable && activeSession === null;

  return (
    <>
      <header className="app-header">
        <strong className="brand">{en.appName}</strong>
        <nav className="app-header__nav" aria-label={en.nav.label}>
          <NavLink className="app-header__link" to="/" end>
            {en.nav.home}
          </NavLink>
          <NavLink className="app-header__link" to="/history">
            {en.nav.history}
          </NavLink>
          <NavLink className="app-header__link" to="/exercises">
            {en.nav.exercises}
          </NavLink>
          <NavLink className="app-header__link" to="/settings">
            {en.nav.settings}
          </NavLink>
        </nav>
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
    </>
  );
}
