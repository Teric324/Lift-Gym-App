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

export type ViewportFix = 'meta' | 'scroll' | 'height' | 'none' | 'not-needed';

/** True when the window is as tall as the screen (the launch bug is gone). */
export function viewportIsRight(innerHeight: number, screenHeight: number): boolean {
  return Math.abs(screenHeight - innerHeight) <= TOLERANCE;
}

/** Text for the Screen info line, e.g. "scroll (793 -> 852)". */
export function describeViewportFix(fix: ViewportFix, before?: number, after?: number): string {
  if (fix === 'not-needed') return 'not needed';
  return `${fix} (${before ?? '?'} -> ${after ?? '?'})`;
}

const frames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) =>
      left <= 0 ? window.setTimeout(resolve, 60) : requestAnimationFrame(() => step(left - 1));
    step(n);
  });

/** Whether the launch bug is currently present (same condition as decideAppHeight). */
function bugPresent(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standalone) return false;
  return (
    decideAppHeight({
      standalone,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenHeight: window.screen.height,
      safeTop: readSafeTop(),
    }).source === 'screen'
  );
}

const rightNow = () => viewportIsRight(window.innerHeight, window.screen.height);

async function remedyMeta(): Promise<void> {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const original = meta.getAttribute('content') ?? '';
  meta.setAttribute('content', `${original}, height=device-height`);
  await frames(2);
  meta.setAttribute('content', original);
  await frames(2);
}

async function remedyScroll(): Promise<void> {
  const html = document.documentElement;
  const body = document.body;
  const savedHtml = html.style.cssText;
  const savedBody = body.style.cssText;
  html.style.overflow = 'visible';
  body.style.overflow = 'visible';
  html.style.height = 'calc(100% + 1px)';
  body.style.height = 'calc(100% + 1px)';
  try {
    window.scrollTo(0, 1);
    await frames(1);
    window.scrollTo(0, 0);
    await frames(2);
  } finally {
    html.style.cssText = savedHtml;
    body.style.cssText = savedBody;
  }
}

async function remedyHeight(): Promise<void> {
  const html = document.documentElement;
  const saved = html.style.height;
  html.style.height = '100.1%';
  await frames(2);
  html.style.height = saved;
  await frames(2);
}

let fixRunning = false;

/**
 * When the launch bug is present, tries to make iOS recompute the viewport. Stops at the first
 * remedy that makes innerHeight equal screen.height; records the outcome in data-viewport-fix.
 */
export async function runViewportFix(): Promise<void> {
  if (fixRunning) return;
  const root = document.documentElement;
  if (!bugPresent()) {
    if (!root.dataset.viewportFix) {
      root.dataset.viewportFix = 'not-needed';
      root.dataset.viewportFixInfo = describeViewportFix('not-needed');
    }
    return;
  }
  fixRunning = true;
  const before = window.innerHeight;
  let result: ViewportFix = 'none';
  try {
    const remedies: [ViewportFix, () => Promise<void>][] = [
      ['meta', remedyMeta],
      ['scroll', remedyScroll],
      ['height', remedyHeight],
    ];
    for (const [name, run] of remedies) {
      try {
        await run();
      } catch {
        // A failing remedy just counts as not working.
      }
      updateAppHeight();
      if (rightNow()) {
        result = name;
        break;
      }
    }
  } finally {
    fixRunning = false;
  }
  root.dataset.viewportFix = result;
  root.dataset.viewportFixInfo = describeViewportFix(result, before, window.innerHeight);
  updateAppHeight();
}

/** Starts keeping --app-height up to date. Returns a function that stops it. */
export function startAppHeight(): () => void {
  updateAppHeight();
  void runViewportFix();
  // The viewport can be corrected a moment after launch without any event.
  const timers = [0, 300, 1000].map((ms) => window.setTimeout(updateAppHeight, ms));
  const onShow = () => {
    updateAppHeight();
    void runViewportFix();
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
