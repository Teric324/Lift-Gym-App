import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

// A new version is downloaded in the background and then *waits*. It does not take over by
// itself: it becomes active on the next full start of the app, or when the user taps
// "Update available" (which is not offered during an active workout).

let updateAvailable = false;
let applyUpdateFn: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Registers the service worker. Call once at startup. */
export function initPwaUpdates(): void {
  applyUpdateFn = registerSW({
    onNeedRefresh() {
      updateAvailable = true;
      emit();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // An installed PWA is usually resumed, not reloaded: look for a new version when it comes
      // back to the foreground (and hourly while open).
      const check = () => void registration.update().catch(() => undefined);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, CHECK_INTERVAL_MS);
    },
  });
}

/** Activates the waiting version and reloads the page. */
export function applyUpdate(): void {
  void applyUpdateFn?.(true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => updateAvailable,
    () => false,
  );
}
