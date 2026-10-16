/**
 * Height of the app shell (#root), published as the CSS variable --app-height.
 *
 * Why: in the iOS Home Screen app, right after launch, window.innerHeight and the layout viewport
 * are short by exactly the top safe-area inset (852 - 59 = 793 on an iPhone 393x852) until the
 * first scroll gesture. Everything below that is still painted, but 100% / fixed / inset: 0 all
 * resolve against the wrong viewport and the bottom bar floats. screen.height is right at that
 * moment, so in that one situation it is used instead.
 *
 * The keyboard is deliberately not handled here: iOS keeps innerHeight when the keyboard opens
 * (only visualViewport changes), so the height does not jump; Layout adds --keyboard-inset.
 */

export type AppHeightSource = 'innerHeight' | 'screen';

export interface AppHeightInput {
  /** navigator.standalone === true (iOS Home Screen app). */
  standalone: boolean;
  innerWidth: number;
  innerHeight: number;
  screenHeight: number;
  /** env(safe-area-inset-top) in px. */
  safeTop: number;
}

/** Allowed difference between the missing height and the safe-area inset, in px. */
const TOLERANCE = 2;

/**
 * Pure decision. Portrait only: iOS screen.width/height do not swap in landscape, so there
 * screen.height would be the wrong axis.
 */
export function decideAppHeight(input: AppHeightInput): {
  height: number;
  source: AppHeightSource;
} {
  const { standalone, innerWidth, innerHeight, screenHeight, safeTop } = input;
  const missing = screenHeight - innerHeight;
  const portrait = innerWidth < innerHeight;
  if (
    standalone &&
    portrait &&
    missing > 0 &&
    safeTop > 0 &&
    Math.abs(missing - safeTop) <= TOLERANCE
  ) {
    return { height: screenHeight, source: 'screen' };
  }
  return { height: innerHeight, source: 'innerHeight' };
}

/** Reads env(safe-area-inset-top) in px through a throw-away element. */
function readSafeTop(): number {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)';
  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return value;
}

/** Computes and publishes --app-height; also records the source in data-app-height-source. */
export function updateAppHeight(): void {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const { height, source } = decideAppHeight({
    standalone,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenHeight: window.screen.height,
    safeTop: standalone ? readSafeTop() : 0,
  });
  const root = document.documentElement;
  root.style.setProperty('--app-height', `${height}px`);
  root.dataset.appHeightSource = source;
}

/** Starts keeping --app-height up to date. Returns a function that stops it. */
export function startAppHeight(): () => void {
  updateAppHeight();
  // The viewport can be corrected a moment after launch without any event.
  const timers = [0, 300, 1000].map((ms) => window.setTimeout(updateAppHeight, ms));
  const onShow = () => {
    updateAppHeight();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') onShow();
  };
  window.addEventListener('resize', updateAppHeight);
  window.addEventListener('orientationchange', updateAppHeight);
  window.addEventListener('pageshow', onShow);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    timers.forEach(window.clearTimeout);
    window.removeEventListener('resize', updateAppHeight);
    window.removeEventListener('orientationchange', updateAppHeight);
    window.removeEventListener('pageshow', onShow);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
