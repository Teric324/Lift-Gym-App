import { useEffect, useRef, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { applyUpdate, useUpdateAvailable } from '../features/pwa/update';
import { useActiveSession } from '../features/session/useActiveSession';
import { en } from '../i18n/en';
import { BoltIcon, HistoryIcon, ListIcon, SlidersIcon } from '../ui/icons';
import { ScreenInfoOverlay } from '../features/settings/ViewportInfo';
import { Wordmark } from '../ui/Wordmark';

/** Does `pathname` belong to the tab at `to` (or to one of the extra path prefixes)? */
function isTabActive(pathname: string, to: string, extraPrefixes: readonly string[]): boolean {
  if (to === '/') {
    return pathname === '/' || extraPrefixes.some((prefix) => pathname.startsWith(prefix));
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Tab({
  to,
  also = [],
  icon,
  label,
}: {
  to: string;
  /** Other paths (prefixes) that keep this tab lit, such as the workout in progress. */
  also?: readonly string[];
  icon: ReactNode;
  label: string;
}) {
  const { pathname } = useLocation();
  const active = isTabActive(pathname, to, also);
  return (
    <Link
      className={`tabbar__link${active ? ' active' : ''}`}
      to={to}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      <span className="tabbar__label">{label}</span>
    </Link>
  );
}

/**
 * The window does not scroll (see theme.css; the shell height is app-height.ts), so:
 * - a new page starts at the top of the scroll area,
 * - the area under the on-screen keyboard is added to the scroll area's padding (--keyboard-inset)
 *   so a focused field near the end of a page can still be scrolled into view.
 */
function useAppShell(mainRef: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname, mainRef]);

  useEffect(() => {
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
        <Tab to="/" also={['/session']} icon={<BoltIcon />} label={en.nav.home} />
        <Tab to="/history" icon={<HistoryIcon />} label={en.nav.history} />
        <Tab to="/exercises" icon={<ListIcon />} label={en.nav.exercises} />
        <Tab to="/settings" icon={<SlidersIcon />} label={en.nav.settings} />
      </nav>
      <ScreenInfoOverlay />
    </>
  );
}
