import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { applyUpdate, useUpdateAvailable } from '../features/pwa/update';
import { useActiveSession } from '../features/session/useActiveSession';
import { en } from '../i18n/en';
import { BoltIcon, HistoryIcon, ListIcon, SlidersIcon } from '../ui/icons';
import { ScreenInfoOverlay } from '../features/settings/ViewportInfo';
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

/**
 * The window does not scroll (see theme.css), so this keeps the shell honest:
 * - a new page starts at the top of the scroll area,
 * - the window is nudged to the top on start and when the app comes back, which is what the
 *   iOS rubber-band does and which makes it recompute the viewport,
 * - the area under the on-screen keyboard is added to the scroll area's padding (--keyboard-inset)
 *   so a focused field near the end of a page can still be scrolled into view.
 */
function useAppShell(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname, mainRef]);

  useEffect(() => {
    const nudge = () => window.scrollTo(0, 0);
    nudge();
    const timers = [100, 400, 1000].map((ms) => window.setTimeout(nudge, ms));
    window.addEventListener('pageshow', nudge);
    window.addEventListener('orientationchange', nudge);
    const onVisible = () => {
      if (document.visibilityState === 'visible') nudge();
    };
    document.addEventListener('visibilitychange', onVisible);

    const viewport = window.visualViewport;
    const root = document.documentElement;
    const keyboard = () => {
      if (!viewport) return;
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      root.style.setProperty(
        '--keyboard-inset',
        covered > 100 ? `${Math.round(covered)}px` : '0px',
      );
    };
    viewport?.addEventListener('resize', keyboard);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener('pageshow', nudge);
      window.removeEventListener('orientationchange', nudge);
      document.removeEventListener('visibilitychange', onVisible);
      viewport?.removeEventListener('resize', keyboard);
      root.style.removeProperty('--keyboard-inset');
    };
  }, []);
}

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  useAppShell(mainRef);
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
      <main className="app-main" ref={mainRef}>
        <div className="app-page">
          <Outlet />
        </div>
      </main>
      <nav className="tabbar" aria-label={en.nav.label}>
        <Tab to="/" end icon={<BoltIcon />} label={en.nav.home} />
        <Tab to="/history" icon={<HistoryIcon />} label={en.nav.history} />
        <Tab to="/exercises" icon={<ListIcon />} label={en.nav.exercises} />
        <Tab to="/settings" icon={<SlidersIcon />} label={en.nav.settings} />
      </nav>
      <ScreenInfoOverlay />
    </>
  );
}
