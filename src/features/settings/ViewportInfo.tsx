import { useEffect, useRef, useState } from 'react';
import { en } from '../../i18n/en';

const round = (n: number) => Math.round(n * 10) / 10;

/** The numbers that decide where the page and the bottom bar sit, for finding layout problems. */
function measure(probe: HTMLElement | null): string {
  const vv = window.visualViewport;
  const style = probe ? getComputedStyle(probe) : null;
  const rect = (selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return '-';
    const r = el.getBoundingClientRect();
    return `${round(r.top)} .. ${round(r.bottom)}`;
  };
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return [
    `window     ${window.innerWidth} x ${window.innerHeight}`,
    `viewport   ${round(vv?.width ?? 0)} x ${round(vv?.height ?? 0)}  top ${round(vv?.offsetTop ?? 0)}  page ${round(vv?.pageTop ?? 0)}`,
    `screen     ${screen.width} x ${screen.height}`,
    `document   ${document.documentElement.clientHeight} high, scrolled ${round(window.scrollY)}`,
    `safe area  top ${style?.paddingTop ?? '?'}  bottom ${style?.paddingBottom ?? '?'}`,
    `app height ${document.documentElement.style.getPropertyValue('--app-height') || '-'}  from ${document.documentElement.dataset.appHeightSource ?? '-'}`,
    `html       ${round(parseFloat(getComputedStyle(document.documentElement).height) || 0)}px  standalone attr ${document.documentElement.hasAttribute('data-standalone') ? 'yes' : 'no'}  display-mode ${window.matchMedia('(display-mode: standalone)').matches ? 'yes' : 'no'}`,
    `root       ${rect('#root')}`,
    `main       ${rect('.app-main')}  scrolled ${round(document.querySelector('.app-main')?.scrollTop ?? 0)}`,
    `top bar    ${rect('.app-header')}`,
    `bottom bar ${rect('.tabbar')}`,
    `app mode   ${standalone ? 'home screen' : 'browser'}`,
  ].join('\n');
}

const FLAG = 'liftScreenInfo';

/** Whether the numbers are shown on every page (kept on this phone only). */
export function isScreenInfoOn(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function setScreenInfoOn(on: boolean): void {
  try {
    if (on) localStorage.setItem(FLAG, '1');
    else localStorage.removeItem(FLAG);
  } catch {
    // Storage unavailable: the switch simply does nothing.
  }
}

/** The same numbers as a small panel over any page, so the problem page itself can be measured. */
export function ScreenInfoOverlay() {
  if (!isScreenInfoOn()) return null;
  return (
    <div className="viewport-overlay">
      <ViewportInfo compact />
    </div>
  );
}

export function ViewportInfo({ compact = false }: { compact?: boolean }) {
  const [on, setOn] = useState(isScreenInfoOn);
  const probe = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    const update = () => setText(measure(probe.current));
    update();
    const timer = setInterval(update, 1000);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <div className="viewport-info">
      {!compact && <h2>{en.settings.screenInfoHeading}</h2>}
      <pre className="muted">{text}</pre>
      {!compact && (
        <button
          type="button"
          className="button"
          onClick={() => {
            setScreenInfoOn(!on);
            setOn(!on);
          }}
        >
          {on ? en.settings.screenInfoHide : en.settings.screenInfoShow}
        </button>
      )}
      {/* Reads the safe-area insets: padding in env() units is resolved by the browser. */}
      <div
        ref={probe}
        aria-hidden="true"
        style={{
          position: 'fixed',
          visibility: 'hidden',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      />
    </div>
  );
}
